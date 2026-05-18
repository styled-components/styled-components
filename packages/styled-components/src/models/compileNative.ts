import {
  AttrSelector,
  ConditionalAttr,
  DYN,
  NATIVE_AT_CLASS,
  NATIVE_RULE_CLASS,
  NativeRuleClass,
  NodeKind,
  NthSpec,
  PseudoState,
  StaticAtRuleNode,
  StaticDeclNode,
  StaticNode,
  StaticRoot,
  StaticRuleNode,
} from '../parser/ast';
import { classifyAtRuleNow, classifyRuleNow } from '../parser/nativePlan';
import { camelize, transformDecl } from '../native/transform';
import { warnIfNativeCssVar, warnIfSentinelLeak, warnOnce } from '../native/transform/dev';
import { getPrimaryPassthroughKey } from '../native/transform/passthrough';
import {
  buildResolver,
  indexOfUnquotedSubstring,
  Resolver,
  substituteVars,
} from '../native/transform/polyfills/resolvers';
import { PERSPECTIVE_SENTINEL_KEY } from '../native/transform/polyfills/standaloneTransform';
import {
  ANIMATION_LONGHAND_KEYS,
  TRANSITION_LONGHAND_KEYS,
} from '../native/animation/parse-shorthand';
import type {
  AnimationDescriptor,
  EasingDescriptor,
  TransitionDescriptor,
} from '../native/animation/types';
import { parse } from '../parser/parser';
import { Dict, StyleSheet } from '../types';
import { normalize } from '../utils/normalize';
import { fifoSet } from '../utils/fifoMap';
import { isWS, UPPER_TO_LOWER } from '../utils/charCodes';

export const RN_UNSUPPORTED_VALUES = ['fit-content', 'min-content', 'max-content'];

export type ConditionType =
  | 'media'
  | 'container'
  | 'supports'
  | 'pseudo'
  | 'attr'
  /** Combinator against a referenced styled component (`${Foo} &`,
   *  `${Foo} > &`, `${Foo} + &`, `${Foo} ~ &`). `condition` holds the
   *  referenced id; `combinator` distinguishes the four forms. */
  | 'combinator'
  /** Tree-structural pseudo-classes that match by the element's
   *  position among its parent's children (`:first-child`,
   *  `:last-child`, `:only-child`, `:nth-child(an+b)`,
   *  `:nth-last-child(an+b)`, `:nth-of-type(an+b)`,
   *  `:nth-last-of-type(an+b)`). `nthSpec` carries the structured
   *  `(a, b, fromEnd, ofType)` representation. */
  | 'nthChild'
  /** `&:has(<simple>)`. Match runs a recursive walk over the element's
   *  `props.children` looking for a descendant that satisfies the inner
   *  simple selector (`${Component}` or `[attr]` / `[attr=value]`). */
  | 'has';

export type { PseudoState, ConditionalAttr, NthSpec };

export interface ConditionalStyle {
  type: ConditionType;
  /**
   * For media/container/supports: the raw prelude (e.g. `(min-width: 400px)`).
   * For pseudo: the pseudo-state name (`hover`, `pressed`, etc.) from {@link PseudoState}.
   * For attr: the attribute name (mirrored from {@link attribute}; render-time
   * logic reads `attribute`).
   * When type is `container`, {@link containerName} holds the optional named-container.
   */
  condition: string;
  containerName?: string;
  /**
   * When set, the bucket is ALSO gated on a pseudo-state (from `&:hover` nested
   * inside a `@media`/`@container`/`@supports` rule). The render path merges
   * the bucket only when BOTH the outer condition AND the pseudo-state hold.
   */
  pseudo?: PseudoState;
  /**
   * For type 'attr': one or more (name, value?) pairs that ALL must
   * match for the bucket to apply. Single-attr selectors produce a
   * one-element array; compound selectors (`&[a][b]`) produce an
   * AND-list. Comma-grouped selectors fan out into one bucket per
   * group, each with its own attrs list.
   */
  attrs?: ConditionalAttr[];
  /**
   * Inversion flag for `&:not(<simple-selector>)`. When true, the
   * matcher inverts the result of the pseudo / attr predicate so the
   * bucket fires when the inner selector does NOT match.
   */
  negate?: boolean;
  /** For type 'combinator': `descendant` matches anywhere on the
   *  ancestor chain; `child` matches only the immediate parent;
   *  `adjacent-sibling` matches when the previous sibling is the
   *  referenced component; `general-sibling` matches when any prior
   *  sibling is the referenced component. */
  combinator?: 'descendant' | 'child' | 'adjacent-sibling' | 'general-sibling';
  /** For type 'nthChild': the (a, b, fromEnd, ofType) representation
   *  parsed from `:nth-child(an+b)` / `:nth-last-of-type(an+b)` etc. */
  nthSpec?: NthSpec;
  /** For type 'has': inner simple selector that must match at least
   *  one descendant of the element at render time. */
  hasInner?: { kind: 'component'; id: string } | { kind: 'attr'; attr: ConditionalAttr };
  styles: Dict<any>;
  /**
   * Resolvers extracted from the bucket's styles (theme sentinels, viewport
   * units, env(), light-dark(), etc.). Applied at render time when the
   * bucket's condition matches.
   */
  resolvers?: Array<[string, Resolver]>;
  /**
   * Declarations marked `!important` are tracked separately so they can
   * be layered AFTER all normal declarations (including any later
   * bucket's normal values) at render time. Only set when the bucket
   * carries at least one `!important` decl.
   */
  important?: Dict<any>;
  /** Render-time resolvers attached to `important` declarations. */
  importantResolvers?: Array<[string, Resolver]>;
  /**
   * Decl values that contain a `var(--name)` reference, deferred from
   * the bucket-build pass. Resolved at bucket-match time against the
   * active cascade map; output merges into the bucket's normal layer
   * (or the important layer per the tuple's importance flag).
   */
  varDeferred?: ReadonlyArray<readonly [string, string, boolean]>;
}

/** Partition slice for {@link NativeStyles.nonPseudoEntries}: never `type: 'pseudo'`. */
export type NonPseudoConditionalStyle = Omit<ConditionalStyle, 'type'> & {
  type: Exclude<ConditionType, 'pseudo'>;
};

function isNonPseudoConditionalStyle(entry: ConditionalStyle): entry is NonPseudoConditionalStyle {
  return entry.type !== 'pseudo' && !entry.pseudo;
}

export interface CompiledKeyframes {
  name: string;
  frames: Array<{
    stops: string[];
    /** Static (post-transformDecl) declarations; key is the camelCase RN prop. */
    decls: Dict<any>;
    /**
     * Render-time resolvers extracted from this frame's declarations
     * (theme sentinels, viewport / container units, env(), light-dark()).
     * The animation adapter applies these against the active ResolveEnv
     * before interpolating between frames.
     */
    resolvers?: Array<[string, Resolver]>;
    /** Per-frame easing from `animation-timing-function` inside the keyframe block. */
    easing?: EasingDescriptor;
  }>;
}

export interface NativeStyles {
  /** Unconditional declarations applied every render. */
  base: Dict<any>;
  /** Conditional buckets; render-time matches decide which merge onto base. */
  conditional: ConditionalStyle[];
  /**
   * Subset of `conditional` containing only entries the per-render
   * `matchConditionals` walks (i.e. buckets without a pseudo-state
   * gate). Precomputed at compile time so the render path doesn't
   * re-skip pseudo entries on every render.
   */
  nonPseudoEntries: NonPseudoConditionalStyle[];
  /**
   * Subset of `conditional` containing only pseudo-bearing buckets
   * (`:hover` / `:focus` / `:pressed` / `:disabled`, including compound
   * `&[attr]:hover` and `&:nth-child(...):hover` forms). The state
   * callback iterates this slice instead of re-scanning all conditional
   * entries on every state transition.
   */
  pseudoEntries: ConditionalStyle[];
  /**
   * `true` when {@link pseudoEntries} is non-empty; convenience alias so
   * the render path can check a single boolean to decide whether to
   * emit the state-callback branch.
   */
  hasPseudo: boolean;
  /** Keyframes collected for animation-adapter handoff. */
  keyframes: CompiledKeyframes[];
  /**
   * Element-level "special case" props lifted out of the style object.
   * Some RN components (Text, TextInput) read certain values as top-level
   * props rather than style keys (e.g. `numberOfLines` from `line-clamp`).
   * The render path spreads these onto the rendered element with user props
   * winning.
   */
  specialCases?: Dict<any>;
  /**
   * `@starting-style { … }` bodies collected for the animation adapter.
   * Represent the initial state a component animates FROM when it first
   * mounts (web: discrete-property transitions + `allow-discrete`;
   * native: first-render animation source). Captured here; the
   * animation adapter is the consumer.
   */
  startingStyle?: Dict<any>;
  /**
   * Render-time resolvers attached to `startingStyle` declarations. Same
   * shape as `resolvers`; the animation adapter applies these onto
   * `startingStyle` before handing it to the first-render layer.
   */
  startingStyleResolvers?: Array<[string, Resolver]>;
  /**
   * Render-time resolvers for values that can't be resolved statically
   * (viewport units, container units, `light-dark()`, `env()`, theme
   * tokens). Each entry is `[styleKey, resolverFn]`. On render, apply
   * in order against the current `ResolveEnv` and overlay onto `base`.
   */
  resolvers?: Array<[string, Resolver]>;
  /**
   * Resolved CSS `animation` declarations, lifted from `base` so the
   * render path can hand them to the registered animation adapter
   * without dragging through every per-render style merge. One
   * descriptor per name in `animation-name` (or per single-animation
   * comma group). Set only when the source CSS uses `animation` or any
   * `animation-*` longhand.
   */
  animations?: AnimationDescriptor[];
  /**
   * Resolved CSS `transition` declarations, lifted from `base`. One
   * descriptor per name in `transition-property`. Set only when the
   * source CSS uses `transition` or any `transition-*` longhand.
   */
  transitions?: TransitionDescriptor[];
  /**
   * Snapshot of the un-registered base style values, captured before
   * `StyleSheet.create`. Set only when animations / transitions /
   * `@starting-style` are present;the adapter compares prop values
   * here to detect transitioning prop changes. Production RN turns
   * `base` into a numeric StyleSheet id, so the rendered style no
   * longer carries the values; this field is the source of truth.
   */
  baseValues?: Dict<any>;
  /**
   * Container-query metadata extracted from the source CSS at compile
   * time. Set when the static base declares `container-type` with a
   * non-`normal` value. The render path reads this to decide whether
   * to wrap the component in a `ContainerPublisher` (so descendants'
   * `cq*` units resolve against this element) and how to name it.
   *
   * `explicitName` is the value of `container-name` if the user wrote
   * one; otherwise undefined and the render path auto-names with the
   * styled-component's `styledComponentId`. The componentId is also
   * injected into the runtime style as `containerName` so rn-web
   * emits the matching `container-name: <id>` CSS for the browser.
   */
  containerInfo?: { type: string; explicitName?: string };
  /**
   * `field-sizing`. Set when the source CSS declared
   * `field-sizing: content` on a styled component targeting
   * `TextInput`. The polyfill itself lifts `multiline: true`
   * via SPECIAL_CASE_PROPS and lets RN's shadow-view measure callback
   * grow the view to its natural text size; no JS-side autosize
   * wiring. This flag exists so the render path can dev-warn when the
   * user passes `multiline={false}` explicitly (voiding the lift).
   * On rn-web the polyfill keeps the declaration in `base` so the
   * browser handles `field-sizing` natively;the extract here only
   * runs on non-rn-web bundles via `__NATIVE_WEB__` tree-shaking.
   */
  fieldSizing?: 'content';
  /**
   * `true` when this compile output COULD publish a cascade value
   * (font-size / line-height / direction) to descendants. Set when any
   * of base, resolvers, conditional buckets, starting-style, transitions,
   * or animation keyframes declare a cascade key. Lets the render path
   * skip the per-render `collectCascadeSlots` walk when both this flag
   * is false AND no user style was supplied (the only other source of
   * cascade keys is a `style={{ fontSize: ... }}` prop).
   */
  publishesCascade: boolean;
  /**
   * CSS custom property declarations (`--name: value;`) collected from
   * the base styles. Published to descendants via NativeStyleContext so
   * a child's `var(--name)` references resolve through the cascade. Set
   * only when at least one `--xxx` decl appears; rn-web leaves these in
   * the base so the browser's own cascade handles them.
   */
  customProperties?: ReadonlyMap<string, string>;
  /**
   * Declarations marked `!important` tracked separately so they can be
   * overlayed AFTER all normal merging (including matched conditional
   * buckets) at render time. `important` is the resolver-stripped
   * static partial; `importantResolvers` holds the per-key render-time
   * resolvers for important declarations. Within-component only;
   * cross-component cascade of importance is not modeled.
   */
  important?: Dict<any>;
  importantResolvers?: Array<[string, Resolver]>;
  /**
   * Declarations whose raw value contains a `var(--name)` reference,
   * deferred from `transformDecl` so the runtime can substitute against
   * the inherited custom-property map and then re-tokenize the result
   * (preserving shorthand expansion of the substituted text). Each
   * entry is `[prop, rawValue]` exactly as authored.
   */
  varDeferred?: ReadonlyArray<readonly [string, string, boolean]>;
}

/**
 * Special-case metadata;keys that look like styles but are read as
 * top-level props by specific React Native component types. The render
 * path uses `validOn` (component `displayName`/`name`) for a dev-only
 * warning when the surrounding styled component renders into an element
 * that won't read the prop. `source` is the CSS property the user wrote.
 */
export interface SpecialCaseMeta {
  validOn: ReadonlyArray<string>;
  source: string;
  /**
   * Default `0`: user prop wins (the lift fills in only when the prop
   * is absent). Positive values let the compiled value take priority
   * over an author-supplied prop of the same name; higher wins.
   * Required for `inert`: hit-testing, text-selection, and editable
   * suppression act as if their underlying props were the inert values
   * regardless of actual value.
   */
  priority?: number;
}

// `View` props inherit broadly via React Native's `ViewProps`: every
// touchable / scrollable / Text-derived primitive accepts these. Spelling
// out the realistic targets keeps the dev warning useful when a consumer
// types `interactivity: inert` on a component that genuinely can't accept
// the prop.
const VIEW_LIKE_TARGETS: ReadonlyArray<string> = [
  'View',
  'Text',
  'Pressable',
  'TouchableOpacity',
  'TouchableHighlight',
  'TouchableWithoutFeedback',
  'TouchableNativeFeedback',
  'ScrollView',
  'FlatList',
  'SectionList',
  'VirtualizedList',
];

export const SPECIAL_CASE_PROPS: Record<string, SpecialCaseMeta> = {
  numberOfLines: {
    validOn: ['Text', 'TextInput', 'VirtualText'],
    source: 'line-clamp / text-wrap: nowrap',
  },
  ellipsizeMode: {
    validOn: ['Text', 'TextInput', 'VirtualText'],
    source: 'text-overflow / text-wrap: nowrap',
  },
  bounces: {
    validOn: ['ScrollView', 'FlatList', 'SectionList', 'VirtualizedList'],
    source: 'overscroll-behavior',
  },
  overScrollMode: {
    validOn: ['ScrollView', 'FlatList', 'SectionList', 'VirtualizedList'],
    source: 'overscroll-behavior',
  },
  showsVerticalScrollIndicator: {
    validOn: ['ScrollView', 'FlatList', 'SectionList', 'VirtualizedList'],
    source: 'scrollbar-width',
  },
  showsHorizontalScrollIndicator: {
    validOn: ['ScrollView', 'FlatList', 'SectionList', 'VirtualizedList'],
    source: 'scrollbar-width',
  },
  trackColor: { validOn: ['Switch'], source: 'accent-color' },
  // Android-only Text prop (API 23+); silently dropped on iOS by RN's own
  // view-prop filter. Maps text-wrap balance / pretty into Android's line-
  // breaking modes; iOS has no equivalent in 0.85.
  textBreakStrategy: { validOn: ['Text', 'VirtualText'], source: 'text-wrap' },
  // Android-only Text prop. The hyphens polyfill emits this so `hyphens:
  // auto` reaches Android's system hyphenator instead of being dropped as
  // an unknown style key.
  android_hyphenationFrequency: { validOn: ['Text', 'VirtualText'], source: 'hyphens' },
  // <Image> only. On rn-web `objectFit` is ignored as a style key; the
  // polyfill lifts a `resizeMode` prop carrying the spec-mapped value.
  resizeMode: { validOn: ['Image'], source: 'object-fit' },
  // rn-web LocaleContext lift. rn-web reads `props.dir` to derive its
  // writingDirection context (which the BiDi-aware compiler uses to
  // resolve `text-align: start | end` against). The `direction`
  // polyfill emits this on rn-web so the cascaded direction reaches
  // descendants. On native this entry never fires (the polyfill is
  // gated by `__NATIVE_WEB__`).
  dir: { validOn: [...VIEW_LIKE_TARGETS, 'TextInput', 'Image'], source: 'direction' },
  // Android-only TextInput prop. iOS drops; rationale in
  // `native/transform/polyfills/caretColor.ts`.
  cursorColor: { validOn: ['TextInput'], source: 'caret-color' },
  // iOS TextInput tint for the caret and the selection highlight. Emitted
  // by the caret-color polyfill on iOS only so Android's selection stays
  // untouched (Android uses `cursorColor` for the caret alone).
  selectionColor: { validOn: ['TextInput'], source: 'caret-color' },
  // `interactivity: inert` on rn-web: a single HTML `inert` attribute
  // covers hit-testing, focus, text selection, editable suppression,
  // and a11y subtree hiding. rn-web's
  // `forwardedProps.accessibilityProps` whitelists `inert` so the prop
  // reaches the DOM verbatim. On native this entry never fires (the
  // polyfill is gated by `__NATIVE_WEB__`).
  inert: {
    validOn: [...VIEW_LIKE_TARGETS, 'TextInput'],
    source: 'interactivity',
    priority: 1,
  },
  // `interactivity: inert` on native: RN has no `inert` prop, so the
  // polyfill lifts the six underlying surfaces individually. Priority
  // over author props is required: hit-testing must act as if
  // `pointer-events` were `none` regardless of its actual value, and
  // equivalent for the a11y / focus / selection / editable surfaces.
  // The lift is skipped on rn-web (see `shouldLiftSpecialCase`); rn-web
  // deprecated `props.pointerEvents` in favor of `style.pointerEvents`.
  pointerEvents: { validOn: VIEW_LIKE_TARGETS, source: 'interactivity', priority: 1 },
  accessibilityElementsHidden: {
    validOn: VIEW_LIKE_TARGETS,
    source: 'interactivity',
    priority: 1,
  },
  importantForAccessibility: {
    validOn: VIEW_LIKE_TARGETS,
    source: 'interactivity',
    priority: 1,
  },
  focusable: { validOn: VIEW_LIKE_TARGETS, source: 'interactivity', priority: 1 },
  // Text-selection suppression for `interactivity: inert`: text
  // selection must act as if `user-select` was `none`.
  selectable: {
    validOn: ['Text', 'TextInput', 'VirtualText'],
    source: 'interactivity',
    priority: 1,
  },
  // Editable suppression; same spec section: "If the element or text
  // node is editable, it must behave as if it was non-editable." RN's
  // TextInput exposes editability via `editable`.
  editable: { validOn: ['TextInput'], source: 'interactivity', priority: 1 },
  // `field-sizing: content` lifts `multiline: true` so the user can
  // write a single CSS declaration on a single-line `styled.TextInput`
  // and get an autosizing multiline field; RN's shadow-view measure
  // callback then grows the view to its natural text size. Explicit
  // `multiline={false}` from the user still wins (special cases spread
  // with user props winning), and the render path dev-warns when that
  // happens since the autosize behavior is voided.
  multiline: { validOn: ['TextInput'], source: 'field-sizing' },
};

/**
 * Whether a compile output requires the dynamic responsive matching pass
 * at render time (`@media`/`@container`/`@supports`/pseudo states/
 * attribute selectors via `conditional`, or theme tokens / viewport units
 * / `env()` / `light-dark()` via `resolvers`).
 */
export function hasResponsiveOutput(compiled: NativeStyles): boolean {
  return (
    compiled.conditional.length > 0 ||
    compiled.resolvers !== undefined ||
    compiled.important !== undefined ||
    compiled.importantResolvers !== undefined ||
    compiled.fieldSizing === 'content'
  );
}

// Keyed by raw CSS string; V8 caches a string's hash on first access so
// warm hits skip the djb2/base-52 work. FIFO at the ceiling matches the
// per-instance caches on `WebStyle` and `NativeStyle`.
let compileCache = new Map<string, NativeStyles>();
const CACHE_LIMIT = 200;

export function resetNativeStyleCache(): void {
  compileCache = new Map();
  pairCache = new Map();
  pairCacheSize = 0;
}

/**
 * Translate a CSS string into the React Native runtime style structure
 * (`{ base, conditional, keyframes, startingStyle?, resolvers? }`). Output
 * is neither a CSS string nor an AST;it's the third representation the
 * engine speaks: RN-runtime data shaped for the render impl to apply.
 *
 * The translation does three things in one pass: parse the CSS, route
 * each node into the bucket the runtime evaluates it from (base style,
 * conditional gate, keyframe set, resolver function), and run each
 * declaration through the per-pair transform layer (camelCase, numeric
 * coercion, color-math polyfills, shorthand expansion).
 *
 * Cache key is the RAW input string; preprocessing is the second-most
 * expensive step (after parse), so caching against raw input lets warm
 * cache hits skip both preprocess and parse. The same raw input always
 * produces the same preprocessed output, so this is collision-safe.
 */
export function toNativeStyles(rawCSS: string, styleSheet: StyleSheet): NativeStyles {
  const cached = compileCache.get(rawCSS);
  if (cached !== undefined) return cached;

  const preprocessed = normalize(rawCSS);
  // Parse stamps `[NATIVE_RULE_CLASS]` / `[NATIVE_AT_CLASS]` onto Rule
  // and AtRule nodes inline (gated on `__NATIVE__`). The bucket router
  // in `astToNativeStyles` reads those classifications directly.
  const ast = parse(preprocessed, { keepCommaSpaces: true });
  const compiled = astToNativeStyles(ast, styleSheet);

  fifoSet(compileCache, rawCSS, compiled, CACHE_LIMIT);
  return compiled;
}

/**
 * Translate a pre-parsed AST into the RN runtime style structure. Used by
 * the construction-time Source path in `NativeStyle.compile` to skip the
 * `string -> AST` round-trip when the AST is already in hand from
 * `parseSource()` time.
 */
export function astToNativeStyles(ast: StaticRoot, styleSheet: StyleSheet): NativeStyles {
  // Flat array of DeclNode references. One slot per decl (half of the
  // legacy [prop, value, prop, value, …] form) AND lets the static-decl
  // precompile reach the node's DYN flag + WeakMap-cached partial.
  const baseDecls: StaticDeclNode[] = [];
  const conditional: ConditionalStyle[] = [];
  const keyframes: CompiledKeyframes[] = [];
  const startingDecls: StaticDeclNode[] = [];

  walkRoot(ast, baseDecls, conditional, keyframes, startingDecls);

  const {
    raw: baseRaw,
    base: resolvedBase,
    resolvers,
    important,
    importantResolvers,
    customProperties,
    varDeferred,
  } = baseDecls.length > 0
    ? processDecls(baseDecls)
    : {
        raw: {},
        base: {},
        resolvers: [],
        important: null as Dict<any> | null,
        importantResolvers: null as Array<[string, Resolver]> | null,
        customProperties: null as Map<string, string> | null,
        varDeferred: null as Array<[string, string, boolean]> | null,
      };
  const specialCases = extractSpecialCases(resolvedBase);
  const animations = extractAnimations(resolvedBase);
  const transitions = extractTransitions(resolvedBase);
  const containerInfo = extractContainerInfo(resolvedBase);
  // Only lift `fieldSizing` out of `base` on native bundles; on rn-web
  // the polyfill leaves it in place so the browser sees `field-sizing`
  // and handles autosize without engaging the render-time hook.
  const fieldSizing = __NATIVE_WEB__ ? null : extractFieldSizing(resolvedBase);
  // Snapshot the FULL base (including sentinel-laden values that became
  // resolvers) for the animation adapter to diff across renders.
  // Capturing only `resolvedBase` would miss values that contain
  // createTheme sentinels (`${t.colors.x}`, `${t.space.lg}`);those
  // land in `resolvers` and vanish from the snapshot, so the adapter
  // never sees the prop change.
  //
  // The adapter applies `compiled.resolvers` against `baseValues` at
  // render time to recover the actual values it should diff. Animation
  // and transition longhand keys that we already lifted into
  // `animations` / `transitions` are stripped here so the snapshot only
  // contains real style props.
  //
  // Only stash when an adapter would actually read it (animations /
  // transitions / starting-style present), so the common case stays
  // allocation-free.
  let baseValues: Dict<any> | undefined;
  if (animations !== null || transitions !== null || startingDecls.length > 0) {
    baseValues = {};
    for (const k in baseRaw) {
      if (ANIMATION_LONGHAND_KEYS.has(k) || TRANSITION_LONGHAND_KEYS.has(k)) continue;
      baseValues[k] = baseRaw[k];
    }
  }
  // Pass the resolved (static) portion through StyleSheet.create for
  // RN's shared-stylesheet registration. Dynamic values skip the sheet
  // (they're applied per-render and don't benefit from registration).
  const hasBaseStyleDecls = hasOwnKeys(resolvedBase);
  const base = hasBaseStyleDecls ? styleSheet.create({ generated: resolvedBase }).generated : {};
  // Single pass: partition conditional into pseudo-bearing and non-pseudo
  // subsets, so neither matchConditionals nor pseudoStylesForState
  // re-scans the other class on every render. Alias `conditional` when
  // it's all-one-kind to avoid empty-vs-clone allocations for the
  // overwhelmingly common shapes (all media / all pseudo).
  const pseudoEntries: ConditionalStyle[] = [];
  const nonPseudoEntries: NonPseudoConditionalStyle[] = [];
  for (let i = 0; i < conditional.length; i++) {
    const e = conditional[i];
    if (isNonPseudoConditionalStyle(e)) nonPseudoEntries.push(e);
    else pseudoEntries.push(e);
  }
  const hasPseudo = pseudoEntries.length > 0;
  const out: NativeStyles = {
    base,
    conditional,
    nonPseudoEntries,
    pseudoEntries,
    keyframes,
    hasPseudo,
    // Filled below after every optional field is attached so the scan
    // can see startingStyle / resolvers / animations / transitions.
    publishesCascade: false,
  };
  if (specialCases !== null) out.specialCases = specialCases;
  if (animations !== null) out.animations = animations;
  if (transitions !== null) out.transitions = transitions;
  if (baseValues !== undefined) out.baseValues = baseValues;
  if (startingDecls.length > 0) {
    // @starting-style decls are applied on the first render by the
    // animation adapter. Run resolvers here so theme sentinels / env() /
    // viewport units inside `@starting-style { … }` are render-time
    // resolvable just like base + conditional buckets.
    const { base: resolvedStarting, resolvers: startingResolvers } = processDecls(startingDecls);
    out.startingStyle = resolvedStarting;
    if (startingResolvers.length > 0) out.startingStyleResolvers = startingResolvers;
  }
  if (resolvers.length > 0) {
    out.resolvers = resolvers;
  }
  if (important !== null) out.important = important;
  if (importantResolvers !== null && importantResolvers.length > 0) {
    out.importantResolvers = importantResolvers;
  }
  if (customProperties !== null) out.customProperties = customProperties;
  if (varDeferred !== null && varDeferred.length > 0) out.varDeferred = varDeferred;
  if (containerInfo !== null) out.containerInfo = containerInfo;
  if (fieldSizing !== null) out.fieldSizing = fieldSizing;
  out.publishesCascade = computePublishesCascade(out);
  return out;
}

/**
 * Scan a compiled output for declarations that could publish a cascade
 * value (font-size / line-height / direction) to descendants. Considers
 * static base, render-time resolvers, conditional buckets and their
 * resolvers, `@starting-style`, transitions, and animation keyframes.
 *
 * Lets the render path's per-render `collectCascadeSlots` walk
 * short-circuit when this flag is false AND the consumer didn't supply
 * a `style={{ fontSize: ... }}` prop (the only other source of cascade
 * values).
 */
function computePublishesCascade(out: NativeStyles): boolean {
  if (hasCascadeKey(out.base)) return true;
  if (out.resolvers && resolversWriteCascadeKey(out.resolvers)) return true;
  for (let i = 0; i < out.conditional.length; i++) {
    const c = out.conditional[i];
    if (hasCascadeKey(c.styles)) return true;
    if (c.resolvers && resolversWriteCascadeKey(c.resolvers)) return true;
  }
  if (out.startingStyle && hasCascadeKey(out.startingStyle)) return true;
  if (out.startingStyleResolvers && resolversWriteCascadeKey(out.startingStyleResolvers)) {
    return true;
  }
  if (out.transitions) {
    for (let i = 0; i < out.transitions.length; i++) {
      const p = out.transitions[i].property;
      if (p === 'all' || isCascadeKey(p)) return true;
    }
  }
  for (let i = 0; i < out.keyframes.length; i++) {
    const frames = out.keyframes[i].frames;
    for (let j = 0; j < frames.length; j++) {
      if (hasCascadeKey(frames[j].decls)) return true;
    }
  }
  return false;
}

function isCascadeKey(k: string): boolean {
  return k === 'fontSize' || k === 'lineHeight' || k === 'direction';
}

/**
 * `true` when `o` has any cascade-publishing key (font-size / line-height /
 * direction) set to a defined value. Exported so `NativeStyle.staticEligible`
 * can use the same set without drift.
 */
export function hasCascadeKey(o: Dict<unknown>): boolean {
  return o.fontSize !== undefined || o.lineHeight !== undefined || o.direction !== undefined;
}

function resolversWriteCascadeKey(rs: ReadonlyArray<[string, unknown]>): boolean {
  for (let i = 0; i < rs.length; i++) {
    if (isCascadeKey(rs[i][0])) return true;
  }
  return false;
}

/**
 * Pull special-case keys out of the resolved base style object. Mutates
 * `base` to remove the lifted keys; returns the lifted bag (or `null` if
 * none). Called on `processDecls.base` (resolver-stripped) so values are
 * static (only the polyfills that emit primitives can produce these keys).
 */
function extractSpecialCases(base: Dict<any>): Dict<any> | null {
  let lifted: Dict<any> | null = null;
  for (const k in base) {
    if (SPECIAL_CASE_PROPS[k] !== undefined && shouldLiftSpecialCase(k)) {
      if (lifted === null) lifted = {};
      lifted[k] = base[k];
      delete base[k];
    }
  }
  return lifted;
}

// `pointerEvents` stays in style on rn-web; rn-web warns when it reaches
// as a prop. Every other special-case key lifts on both bars.
function shouldLiftSpecialCase(key: string): boolean {
  return !(__NATIVE_WEB__ && key === 'pointerEvents');
}

/**
 * Detect the CSS `container-type` / `container-name` declarations in
 * the resolved base and lift them into structured metadata. A non-
 * `normal` `container-type` makes the element a container-query
 * containing block; the render path reads this to wrap the component
 * in `ContainerPublisher` and feed the resolved name into the
 * `ContainerContext` for descendants.
 *
 * Both declarations stay in `base` so rn-web emits the matching CSS
 * for the browser. RN's view-prop filter silently drops unknown style
 * keys, so they're harmless on iOS / Android. Auto-naming with the
 * component's `styledComponentId` happens at render time (the id
 * isn't known here at compile).
 */
function extractContainerInfo(base: Dict<any>): { type: string; explicitName?: string } | null {
  const type = base.containerType;
  if (typeof type !== 'string' || type === 'normal') return null;
  const explicitName = typeof base.containerName === 'string' ? base.containerName : undefined;
  return explicitName !== undefined ? { type, explicitName } : { type };
}

/**
 * Pull `fieldSizing` out of the resolved base into a top-level
 * `NativeStyles.fieldSizing` flag. Only the `content` value triggers
 * runtime work;`fixed` is the platform default and is a no-op even
 * if it shows up here. The render path reads this flag to decide
 * whether to engage the `useState`-backed autosize hook.
 *
 * Mutates `base` to remove the key so RN's style validator doesn't
 * warn about an unknown property.
 */
function extractFieldSizing(base: Dict<any>): 'content' | null {
  const fs = base.fieldSizing;
  if (fs === undefined) return null;
  delete base.fieldSizing;
  return fs === 'content' ? 'content' : null;
}

const DEFAULT_EASING: EasingDescriptor = {
  kind: 'cubic-bezier',
  p: [0.25, 0.1, 0.25, 1],
};

/**
 * Per-descriptor extraction recipe: longhand → descriptor field mapping
 * with the spec-default for each field. The driving longhand (the one
 * whose list length determines the descriptor count under coordinating-
 * list semantics) is the FIRST entry; absence of that longhand means
 * "no descriptors."
 */
const ANIMATION_RECIPE: ExtractRecipe<AnimationDescriptor> = [
  ['animationName', 'name', undefined], // required driver
  ['animationDuration', 'durationMs', 0],
  ['animationTimingFunction', 'timingFunction', DEFAULT_EASING],
  ['animationDelay', 'delayMs', 0],
  ['animationIterationCount', 'iterationCount', 1],
  ['animationDirection', 'direction', 'normal'],
  ['animationFillMode', 'fillMode', 'none'],
  ['animationPlayState', 'playState', 'running'],
  ['animationComposition', 'composition', 'replace'],
];

const TRANSITION_RECIPE: ExtractRecipe<TransitionDescriptor> = [
  // `transition-property` defaults to 'all' when omitted (per spec).
  ['transitionProperty', 'property', 'all'],
  ['transitionDuration', 'durationMs', 0],
  ['transitionTimingFunction', 'timingFunction', DEFAULT_EASING],
  ['transitionDelay', 'delayMs', 0],
  ['transitionBehavior', 'behavior', 'normal'],
];

type ExtractRecipe<T> = ReadonlyArray<[string, keyof T, unknown]>;

function extractAnimations(base: Dict<any>): AnimationDescriptor[] | null {
  return extractDescriptors(base, ANIMATION_RECIPE);
}

function extractTransitions(base: Dict<any>): TransitionDescriptor[] | null {
  const out = extractDescriptors(base, TRANSITION_RECIPE);
  if (out === null) return null;
  // Normalise transition properties to the runtime key (camelCase +
  // passthrough rename) so the adapter's `transitionsByProp` lookup
  // matches against `baseValues` keys directly.
  for (let i = 0; i < out.length; i++) {
    out[i].property = toRuntimeKey(out[i].property) as TransitionDescriptor['property'];
  }
  return out;
}

/**
 * Lift CSS longhand keys out of `base` and assemble them into one or
 * more descriptors per the recipe. The first entry in the recipe is
 * the "driver" longhand whose list length determines the descriptor
 * count; the rest cycle to match (coordinating-list semantics).
 *
 * `base` is mutated in place (keys are deleted as they're consumed).
 * Returns `null` when no recipe longhand is present.
 */
function extractDescriptors<T extends Record<string, any>>(
  base: Dict<any>,
  recipe: ExtractRecipe<T>
): T[] | null {
  let any = false;
  for (let i = 0; i < recipe.length; i++) {
    if (recipe[i][0] in base) {
      any = true;
      break;
    }
  }
  if (!any) return null;

  const lists: (unknown[] | null)[] = new Array(recipe.length);
  for (let i = 0; i < recipe.length; i++) {
    lists[i] = arrayify(base[recipe[i][0]]);
    delete base[recipe[i][0]];
  }

  // The driver list (recipe[0]) determines the descriptor count. When
  // its longhand was absent, we fall back to the recipe's default
  // wrapped in a single-entry list so callers like `transition` (which
  // can elide `transition-property` and default to `'all'`) still
  // produce one descriptor.
  const driver = lists[0] ?? [recipe[0][2]];
  if (driver.length === 0) return null;

  const out: T[] = [];
  for (let i = 0; i < driver.length; i++) {
    const desc = {} as T;
    for (let j = 0; j < recipe.length; j++) {
      const list = j === 0 ? driver : lists[j];
      desc[recipe[j][1]] = pickCycled(list, i, recipe[j][2]) as T[keyof T];
    }
    out.push(desc);
  }
  return out;
}

/**
 * Convert a CSS-side property name (kebab-case, e.g. `background-image`)
 * into the runtime key the host platform uses on the style object
 * (camelCase + passthrough rename, e.g. `experimental_backgroundImage`).
 * Centralised here so the animation adapter can match descriptor
 * properties against compiled `baseValues` keys directly, without
 * per-lookup case translation.
 *
 * Dual-emit passthrough props return the primary (native) key;gradient
 * transitions only run through this adapter on native; rn-web has its
 * own CSS animation pipeline.
 *
 * `'all'` and `'none'` pass through; the adapter treats them as
 * sentinels rather than real prop names.
 */
function toRuntimeKey(prop: string): string {
  if (prop === 'all' || prop === 'none') return prop;
  const camel = camelize(prop);
  return getPrimaryPassthroughKey(camel) ?? camel;
}

function arrayify(v: unknown): unknown[] | null {
  if (v === undefined) return null;
  return Array.isArray(v) ? v : [v];
}

function pickCycled(list: unknown[] | null, i: number, fallback: unknown): unknown {
  if (list === null || list.length === 0) return fallback;
  return list[i % list.length];
}

function describeCondition(entry: ConditionalStyle): string {
  if (entry.type === 'pseudo') return ':' + entry.condition;
  if (entry.type === 'attr') {
    if (!entry.attrs) return '[?]';
    return entry.attrs
      .map(a => (a.value !== undefined ? `[${a.name}="${a.value}"]` : `[${a.name}]`))
      .join('');
  }
  // media / container / supports: type + prelude
  return `@${entry.type} ${entry.condition}`;
}

/**
 * Special-case props inside conditional rules (media query, container
 * query, pseudo, attribute selector) aren't yet routed through the
 * per-render prop merge;only top-level uses are. Drop them with a
 * dev warning so the bucket's style payload stays correct and the user
 * knows the construct silently no-ops.
 */
function stripSpecialCasesFromConditional(styles: Dict<any>, entry: ConditionalStyle): Dict<any> {
  let out: Dict<any> | null = null;
  for (const k in styles) {
    if (SPECIAL_CASE_PROPS[k] !== undefined && shouldLiftSpecialCase(k)) {
      if (__DEV__) {
        const meta = SPECIAL_CASE_PROPS[k];
        const cond = describeCondition(entry);
        warnOnce(
          'native-special-case-cond',
          `\`${meta.source}\` is not supported inside \`${cond}\` on React Native. \`${meta.source}\` maps to React Native's \`${k}\` prop on <${meta.validOn[0]}>, which can't change per condition. Move \`${meta.source}\` to the top level of your styled component.`,
          k + ':' + cond
        );
      }
      if (out === null) out = { ...styles };
      delete out[k];
    }
  }
  return out ?? styles;
}

function hasOwnKeys(o: object): boolean {
  for (const _k in o) {
    void _k;
    return true;
  }
  return false;
}

/**
 * Single-pass: transform every Decl, split resolver-bearing values from
 * static ones, keep the full pre-split form for the animation adapter's
 * `baseValues` diff snapshot. Replaces the v7-early `pairsToObject` +
 * `extractResolvers` two-walk pipeline.
 *
 * Per-decl dispatch:
 * - Static Decls (`![DYN]`): the precomputed `transformDecl` partial lives
 *   in `staticDeclCache` (WeakMap keyed on the AST node), populated lazily
 *   on first touch. Subsequent renders splat the cached object directly,
 *   skipping the camelize / shorthand / polyfill work.
 * - Dynamic Decls (substituted values change per render after `fillAst`):
 *   route through the string-keyed `pairCache` (whole-Map flush at
 *   `PAIR_CACHE_LIMIT`, working set bounded to dynamic decls only).
 *
 * Outputs:
 * - `raw` is the complete RN-side form (sentinel values intact). Used only
 *   for `baseValues` snapshotting on top-level base. Callers that don't
 *   need it (conditional buckets, keyframes, starting-style) get it as a
 *   no-op extra reference and let GC reclaim it.
 * - `base` is the resolver-stripped form: ready to pass through
 *   `StyleSheet.create` since every value is statically renderable.
 * - `resolvers` is the per-key resolver list; the render path applies
 *   each against the active `ResolveEnv` and overlays onto `base`.
 */
// `important` lowercase char codes for the case-insensitive tail compare.
const IMPORTANT_LOWER = [0x69, 0x6d, 0x70, 0x6f, 0x72, 0x74, 0x61, 0x6e, 0x74];

/**
 * Locate the `!` delimiter of a trailing `!important` annotation. The
 * `!` and the `important` ident are separate tokens with optional
 * whitespace between them. Returns the index of `!`, or `-1` when
 * absent. Case-insensitive on the ident, no allocation.
 */
function findImportantStart(value: string): number {
  // Fast bail: most decl values don't contain `!`. One string indexOf
  // skips the whitespace trim + case-folded compare for the common case.
  if (value.indexOf('!') === -1) return -1;
  let end = value.length;
  while (end > 0 && isWS(value.charCodeAt(end - 1))) end--;
  if (end < 9) return -1;
  for (let k = 0; k < 9; k++) {
    let c = value.charCodeAt(end - 9 + k);
    if (c >= 0x41 && c <= 0x5a) c += UPPER_TO_LOWER;
    if (c !== IMPORTANT_LOWER[k]) return -1;
  }
  // Skip any whitespace between `!` and `important`.
  let bangPos = end - 10;
  while (bangPos >= 0 && isWS(value.charCodeAt(bangPos))) bangPos--;
  if (bangPos < 0 || value.charCodeAt(bangPos) !== 0x21) return -1;
  return bangPos;
}

/** Strip a trailing `!important` and trim whitespace. Returns the
 *  original `value` reference when no change is needed. */
function stripImportant(value: string): string {
  const bangPos = findImportantStart(value);
  let end;
  if (bangPos !== -1) {
    end = bangPos;
    while (end > 0 && isWS(value.charCodeAt(end - 1))) end--;
  } else {
    end = value.length;
    while (end > 0 && isWS(value.charCodeAt(end - 1))) end--;
  }
  let start = 0;
  while (start < end && isWS(value.charCodeAt(start))) start++;
  return start === 0 && end === value.length ? value : value.substring(start, end);
}

/** Attach optional resolvers + important + importantResolvers +
 *  varDeferred from a processDecls output to a freshly-built bucket
 *  entry. */
function attachBucketExtras(
  entry: ConditionalStyle,
  resolvers: Array<[string, Resolver]>,
  important: Dict<any> | null,
  importantResolvers: Array<[string, Resolver]> | null,
  varDeferred: Array<[string, string, boolean]> | null
): void {
  if (resolvers.length > 0) entry.resolvers = resolvers;
  if (important !== null) entry.important = important;
  if (importantResolvers !== null && importantResolvers.length > 0) {
    entry.importantResolvers = importantResolvers;
  }
  if (varDeferred !== null && varDeferred.length > 0) entry.varDeferred = varDeferred;
}

function processDecls(decls: StaticDeclNode[]): {
  raw: Dict<any>;
  base: Dict<any>;
  resolvers: Array<[string, Resolver]>;
  important: Dict<any> | null;
  importantResolvers: Array<[string, Resolver]> | null;
  customProperties: Map<string, string> | null;
  varDeferred: Array<[string, string, boolean]> | null;
} {
  const raw: Dict<any> = {};
  const base: Dict<any> = {};
  const resolvers: Array<[string, Resolver]> = [];
  let important: Dict<any> | null = null;
  let importantResolvers: Array<[string, Resolver]> | null = null;
  let customProperties: Map<string, string> | null = null;
  let varDeferred: Array<[string, string, boolean]> | null = null;
  for (let i = 0; i < decls.length; i++) {
    const decl = decls[i];
    let partial: Record<string, any>;
    const { prop } = decl;
    let { value } = decl;
    if (!__NATIVE_WEB__ && prop.charCodeAt(0) === 0x2d && prop.charCodeAt(1) === 0x2d) {
      // Bare `--` is reserved for future use and must not become a
      // custom property; drop silently so it never lands on the host.
      if (prop.length === 2) continue;
      // `initial` resets a custom property to the guaranteed-invalid
      // value, so it should never populate the cascade map.
      const cleaned = stripImportant(value);
      if (cleaned === 'initial') continue;
      if (customProperties === null) customProperties = new Map();
      customProperties.set(prop, cleaned);
      continue;
    }
    // Stripping `!important` early lets the cache keys (pairCache by
    // (prop, strippedValue) / staticDeclCache by decl-node) reuse the
    // partial across same-value normal + important decls.
    const bangPos = !__NATIVE_WEB__ ? findImportantStart(value) : -1;
    const isImportant = bangPos !== -1;
    if (isImportant) {
      value = stripImportant(value);
    }
    if (!__NATIVE_WEB__ && indexOfUnquotedSubstring(value, 'var(--', 0) !== -1) {
      // Defer to render time so the cascade map can supply the
      // substitution; the runtime re-runs transformDecl on the
      // substituted text so shorthand expansion still fires. The
      // quote-aware scan keeps a literal `var(--` inside a CSS string
      // (e.g. `content: "var(--brand)"`) from being mistakenly deferred.
      if (varDeferred === null) varDeferred = [];
      varDeferred.push([prop, value, isImportant]);
      continue;
    }
    if (decl[DYN] === true) {
      // Dynamic-decl path: pairCache (string-keyed, whole-flush eviction).
      // Key on the stripped value so importance is metadata, not storage.
      let inner = pairCache.get(prop);
      const hit = inner !== undefined ? inner.get(value) : undefined;
      if (hit !== undefined) {
        partial = hit;
      } else {
        partial = transformDecl(prop, value);
        if (pairCacheSize >= PAIR_CACHE_LIMIT) {
          pairCache = new Map();
          pairCacheSize = 0;
          inner = undefined;
        }
        if (inner === undefined) {
          inner = new Map();
          pairCache.set(prop, inner);
        }
        inner.set(value, partial);
        pairCacheSize++;
      }
    } else {
      // Static-decl path: per-node WeakMap, primed lazily. Cache the
      // partial for the STRIPPED value so two decl nodes (one important,
      // one normal) with the same authored value share the partial.
      // Important is then layered separately via the routing below.
      const cached = staticDeclCache.get(decl);
      if (cached !== undefined) {
        partial = cached;
      } else {
        partial = transformDecl(prop, value);
        staticDeclCache.set(decl, partial);
      }
    }
    for (const k in partial) {
      const v = partial[k];
      raw[k] = v;
      const r = buildResolver(v);
      if (isImportant) {
        if (important === null) important = {};
        if (r !== null) {
          if (importantResolvers === null) importantResolvers = [];
          importantResolvers.push([k, r]);
        } else {
          if (__DEV__) warnIfSentinelLeak(k, v);
          important[k] = v;
        }
        continue;
      }
      if (r !== null) {
        resolvers.push([k, r]);
      } else {
        if (__DEV__) {
          warnIfSentinelLeak(k, v);
        }
        base[k] = v;
      }
    }
  }
  // rn-web emits raw `perspective:` directly (the browser exposes it as a
  // separate surface), so the sentinel never lands in `base` on web and
  // the post-merge fold is dead. Gate the call so terser can DCE both the
  // helper and the sentinel string on the rn-web bundle.
  if (!__NATIVE_WEB__) foldPerspectiveSentinel(raw, base);
  return { raw, base, resolvers, important, importantResolvers, customProperties, varDeferred };
}

/**
 * Render-time companion to {@link buildResolver}. Walks every
 * `[prop, rawValue]` pair in `compiled.varDeferred`, substitutes
 * `var()` references against the cascade-published custom-property map,
 * and re-runs `transformDecl` on the substituted text so shorthands
 * expand exactly as if the substituted value had been authored
 * literally. Returns the merged partial dict; the caller layers it on
 * top of the static base before composing user style.
 */
export function applyVarDeferred(
  varDeferred: ReadonlyArray<readonly [string, string, boolean?]>,
  customProperties: ReadonlyMap<string, string> | null
): { normal: Dict<any> | null; important: Dict<any> | null } {
  let normal: Dict<any> | null = null;
  let important: Dict<any> | null = null;
  for (let i = 0; i < varDeferred.length; i++) {
    const entry = varDeferred[i];
    const prop = entry[0];
    const rawValue = entry[1];
    const isImportant = entry[2] === true;
    const substituted = substituteVars(rawValue, customProperties);
    if (substituted === null) {
      if (__DEV__) warnIfNativeCssVar(prop, rawValue);
      continue;
    }
    // An empty substituted value invalidates the consuming property;
    // drop rather than landing a bare `''` on the host element.
    if (substituted === '' || substituted.trim() === '') continue;
    const partial = transformDecl(prop, substituted);
    if (isImportant) {
      if (important === null) important = {};
      for (const k in partial) important[k] = partial[k];
    } else {
      if (normal === null) normal = {};
      for (const k in partial) normal[k] = partial[k];
    }
  }
  return { normal, important };
}

/**
 * Compose `perspective: <length>` with any sibling `transform` value in
 * the same declaration block. The perspective polyfill emits a sentinel
 * key so cascade last-wins doesn't drop the perspective when the author
 * also writes `transform:`. The perspective applies to the element's
 * own transform context.
 */
function foldPerspectiveSentinel(raw: Dict<any>, base: Dict<any>): void {
  const persp = base[PERSPECTIVE_SENTINEL_KEY];
  if (persp === undefined) return;
  delete base[PERSPECTIVE_SENTINEL_KEY];
  delete raw[PERSPECTIVE_SENTINEL_KEY];
  // `perspective: none` clears: emit the identity transform. An author
  // `transform:` declared after `perspective: none` still wins because
  // we only fold when persp is still in `base` at end of loop.
  if (persp === 'none') {
    if (base.transform === undefined) {
      base.transform = 'none';
      raw.transform = 'none';
    }
    return;
  }
  const existing = base.transform;
  if (existing === undefined || existing === 'none') {
    base.transform = persp;
    raw.transform = persp;
  } else if (typeof existing === 'string') {
    const composed = persp + ' ' + existing;
    base.transform = composed;
    raw.transform = composed;
  }
}

/**
 * A timing function specified on the `to` or `100%` keyframe is
 * ignored. A frame whose every stop is only `to` or `100%` is treated
 * as that end keyframe. Mixed stops such as `0%, 100%` are not
 * end-only.
 */
function isEndOnlyKeyframeStops(stops: string[]): boolean {
  if (stops.length === 0) return false;
  for (let i = 0; i < stops.length; i++) {
    const s = stops[i].trim().toLowerCase();
    if (s === 'to' || s === '100%') continue;
    return false;
  }
  return true;
}

function walkRoot(
  nodes: StaticNode[],
  baseDecls: StaticDeclNode[],
  conditional: ConditionalStyle[],
  keyframes: CompiledKeyframes[],
  startingDecls: StaticDeclNode[]
): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const kind = node.kind;

    if (kind === NodeKind.Decl) {
      pushDecl(baseDecls, node);
    } else if (kind === NodeKind.Rule) {
      handleRootRule(node, conditional);
    } else if (kind === NodeKind.AtRule) {
      handleAtRule(node, baseDecls, conditional, startingDecls);
    } else if (kind === NodeKind.Keyframes) {
      keyframes.push({
        name: node.prelude,
        frames: node.frames.map(frame => {
          // Mirror the base/conditional pipeline: decls → transformDecl
          // → split static base / resolvers in one pass. Lets
          // `${t.colors.x}` and `env()` inside a keyframe's declarations
          // resolve at render time when the animation adapter applies
          // them.
          const decls = frame.children;
          // `!important` inside a keyframe body is invalid; processDecls
          // strips the marker and routes to `important`, which we then
          // discard so the frame ignores the marker entirely.
          const { base, resolvers } =
            decls.length > 0 ? processDecls(decls) : { base: {}, resolvers: [] };
          const out: {
            stops: string[];
            decls: Dict<any>;
            resolvers?: Array<[string, Resolver]>;
            easing?: EasingDescriptor;
          } = { stops: frame.stops, decls: base };
          if (resolvers.length > 0) out.resolvers = resolvers;
          if ('animationTimingFunction' in base) {
            const atf = base.animationTimingFunction;
            delete base.animationTimingFunction;
            if (!isEndOnlyKeyframeStops(frame.stops)) {
              out.easing = Array.isArray(atf) ? atf[0] : atf;
            }
          }
          return out;
        }),
      });
    }
  }
}

function handleRootRule(node: StaticRuleNode, conditional: ConditionalStyle[]): void {
  // Read parse-time classification when present; fall back to render-time
  // re-classification on the filled selectors when sentinels were
  // present at parse time (rare).
  const cls = readRuleClass(node);
  applyRuleClass(node, cls, conditional, undefined, undefined);
}

/**
 * Apply a classified rule's children into a conditional bucket. When
 * `outerType` is set, the bucket is gated on an enclosing at-rule
 * (`outerType` + `outerCondition` + optional `outerContainerName`); the
 * pseudo / attr classification then layers as a second gate. When
 * `outerType` is undefined the bucket is a top-level conditional
 * (pseudo or attr only).
 */
function applyRuleClass(
  node: StaticRuleNode,
  cls: NativeRuleClass,
  conditional: ConditionalStyle[],
  outer:
    | {
        type: 'media' | 'container' | 'supports';
        condition: string;
        containerName: string | undefined;
      }
    | undefined,
  // Unused parameter retained for symmetry with applyAtRule's signature
  // shape; the linter will catch real un-uses elsewhere.
  _reserved?: undefined
): void {
  if (cls.kind === 'unsupported') {
    if (__DEV__ && outer === undefined) {
      const sels = node.selectors.join(', ');
      warnOnce(
        'native-complex-selector',
        `complex selectors are not supported yet (received: ${sels}). Only pseudo-state selectors (\`&:hover\`, \`&:focus\`, \`&:focus-visible\`, \`&:active\`, \`&:disabled\`), attribute selectors (\`&[aria-pressed]\`, \`&[aria-pressed='true']\`), and \`&:is(...)\` / \`&:where(...)\` enumerations of pseudo states are supported on native. The rule was ignored.`,
        sels
      );
    }
    return;
  }
  const decls = collectDecls(node.children);
  if (decls.length === 0) return;
  const { base, resolvers, important, importantResolvers, varDeferred } = processDecls(decls);

  if (cls.kind === 'pseudo') {
    pushBucket(
      conditional,
      base,
      resolvers,
      important,
      importantResolvers,
      varDeferred,
      outer,
      cls.pseudo,
      undefined,
      cls.negate
    );
  } else if (cls.kind === 'pseudoFanOut') {
    for (let i = 0; i < cls.pseudos.length; i++) {
      pushBucket(
        conditional,
        base,
        resolvers,
        important,
        importantResolvers,
        varDeferred,
        outer,
        cls.pseudos[i],
        undefined,
        undefined
      );
    }
  } else if (cls.kind === 'combinator') {
    pushCombinatorBucket(
      conditional,
      base,
      resolvers,
      important,
      importantResolvers,
      varDeferred,
      outer,
      cls
    );
  } else if (cls.kind === 'nthChild') {
    pushNthChildBucket(
      conditional,
      base,
      resolvers,
      important,
      importantResolvers,
      varDeferred,
      outer,
      cls
    );
  } else if (cls.kind === 'has') {
    pushHasBucket(
      conditional,
      base,
      resolvers,
      important,
      importantResolvers,
      varDeferred,
      outer,
      cls
    );
  } else {
    // attr
    for (let i = 0; i < cls.selectors.length; i++) {
      pushBucket(
        conditional,
        base,
        resolvers,
        important,
        importantResolvers,
        varDeferred,
        outer,
        cls.selectors[i].pseudo,
        cls.selectors[i],
        cls.negate
      );
    }
  }
}

/**
 * `:nth-child` family bucket. The match runs against ParentContext's
 * sibling-position fields published by the parent's per-child Provider.
 * Top-level only (the outer-at-rule + nthChild compound is rejected by
 * the same direct-children scoping as combinators).
 */
function pushNthChildBucket(
  conditional: ConditionalStyle[],
  base: Dict<any>,
  resolvers: Array<[string, Resolver]>,
  important: Dict<any> | null,
  importantResolvers: Array<[string, Resolver]> | null,
  varDeferred: Array<[string, string, boolean]> | null,
  outer:
    | {
        type: 'media' | 'container' | 'supports';
        condition: string;
        containerName: string | undefined;
      }
    | undefined,
  cls: { spec: NthSpec; pseudo?: PseudoState; negate?: boolean }
): void {
  if (outer !== undefined) return;
  const entry: ConditionalStyle = {
    type: 'nthChild',
    condition: nthSpecKey(cls.spec),
    nthSpec: cls.spec,
    styles: base,
  };
  if (cls.pseudo) entry.pseudo = cls.pseudo;
  if (cls.negate === true) entry.negate = true;
  attachBucketExtras(entry, resolvers, important, importantResolvers, varDeferred);
  conditional.push(entry);
}

/** Stable cache-key string for an NthSpec (used as `condition` so
 *  describeCondition and dedup paths have a single source-of-truth
 *  string identity). */
function nthSpecKey(spec: NthSpec): string {
  const dir = spec.fromEnd ? 'L' : 'F';
  const ot = spec.ofType ? 't' : 'c';
  const oc = spec.onlyChild ? '!' : '';
  let key = `nth:${dir}${ot}${oc}:${spec.a}n+${spec.b}`;
  if (spec.of !== undefined) {
    const of = spec.of;
    if (of.kind === 'component') key += `|ofc:${of.id}`;
    else
      key +=
        `|ofa:${of.attr.name}` +
        (of.attr.operator !== undefined ? `${of.attr.operator}` : '=') +
        (of.attr.value !== undefined ? of.attr.value : '') +
        (of.attr.caseFlag !== undefined ? `/${of.attr.caseFlag}` : '');
  }
  return key;
}

/** `:has(<simple>)` bucket. The match walks props.children at render
 *  time looking for a descendant satisfying the inner predicate. */
function pushHasBucket(
  conditional: ConditionalStyle[],
  base: Dict<any>,
  resolvers: Array<[string, Resolver]>,
  important: Dict<any> | null,
  importantResolvers: Array<[string, Resolver]> | null,
  varDeferred: Array<[string, string, boolean]> | null,
  outer:
    | {
        type: 'media' | 'container' | 'supports';
        condition: string;
        containerName: string | undefined;
      }
    | undefined,
  cls: {
    inner: { kind: 'component'; id: string } | { kind: 'attr'; attr: ConditionalAttr };
    pseudo?: PseudoState;
    negate?: boolean;
  }
): void {
  if (outer !== undefined) return;
  const inner = cls.inner;
  const condition =
    inner.kind === 'component'
      ? `has:.${inner.id}`
      : `has:[${inner.attr.name}${inner.attr.value !== undefined ? '=' + inner.attr.value : ''}]`;
  const entry: ConditionalStyle = {
    type: 'has',
    condition,
    hasInner: inner,
    styles: base,
  };
  if (cls.pseudo) entry.pseudo = cls.pseudo;
  if (cls.negate === true) entry.negate = true;
  attachBucketExtras(entry, resolvers, important, importantResolvers, varDeferred);
  conditional.push(entry);
}

/**
 * Combinator bucket: a styled component matched as a descendant or
 * direct child of another styled component reference. The matcher
 * reads ParentContext at render time.
 *
 * Phase 3 scope: top-level combinator selectors only. A combinator
 * nested inside `@media` / `@container` / `@supports` skips the
 * bucket and falls through to the unsupported warn; landing combos
 * is incremental (rare in practice, and the outer-gate bucket shape
 * needs a separate slot for the ancestorId).
 */
function pushCombinatorBucket(
  conditional: ConditionalStyle[],
  base: Dict<any>,
  resolvers: Array<[string, Resolver]>,
  important: Dict<any> | null,
  importantResolvers: Array<[string, Resolver]> | null,
  varDeferred: Array<[string, string, boolean]> | null,
  outer:
    | {
        type: 'media' | 'container' | 'supports';
        condition: string;
        containerName: string | undefined;
      }
    | undefined,
  cls: {
    combinator: 'descendant' | 'child' | 'adjacent-sibling' | 'general-sibling';
    ancestorId: string;
    pseudo?: PseudoState;
  }
): void {
  if (outer !== undefined) return; // not yet supported; see header note
  const entry: ConditionalStyle = {
    type: 'combinator',
    condition: cls.ancestorId,
    combinator: cls.combinator,
    styles: base,
  };
  if (cls.pseudo) entry.pseudo = cls.pseudo;
  attachBucketExtras(entry, resolvers, important, importantResolvers, varDeferred);
  conditional.push(entry);
}

/**
 * Materialize a single conditional bucket from a (base, resolvers)
 * payload plus any combination of outer at-rule / pseudo / attr gates.
 * Centralizes the bucket-shape construction that the legacy bespoke
 * code paths each open-coded.
 */
function pushBucket(
  conditional: ConditionalStyle[],
  base: Dict<any>,
  resolvers: Array<[string, Resolver]>,
  important: Dict<any> | null,
  importantResolvers: Array<[string, Resolver]> | null,
  varDeferred: Array<[string, string, boolean]> | null,
  outer:
    | {
        type: 'media' | 'container' | 'supports';
        condition: string;
        containerName: string | undefined;
      }
    | undefined,
  pseudo: PseudoState | undefined,
  attrSel: AttrSelector | undefined,
  negate: boolean | undefined
): void {
  let entry: ConditionalStyle;
  if (outer) {
    entry = { type: outer.type, condition: outer.condition, styles: base };
    if (outer.containerName) entry.containerName = outer.containerName;
    if (pseudo) entry.pseudo = pseudo;
    if (attrSel) entry.attrs = attrSel.attrs;
  } else if (attrSel) {
    entry = {
      type: 'attr',
      condition: attrSel.attrs
        .map(a => (a.value !== undefined ? `${a.name}=${a.value}` : a.name))
        .join('+'),
      attrs: attrSel.attrs,
      styles: base,
    };
    if (pseudo) entry.pseudo = pseudo;
  } else if (pseudo) {
    entry = { type: 'pseudo', condition: pseudo, styles: base };
  } else {
    return;
  }
  if (negate === true) entry.negate = true;
  entry.styles = stripSpecialCasesFromConditional(base, entry);
  attachBucketExtras(entry, resolvers, important, importantResolvers, varDeferred);
  conditional.push(entry);
}

/**
 * Read parse-time classification when present; otherwise re-classify
 * on the filled selectors (fallback path for selectors that carried
 * `\0I` sentinels at parse time).
 */
function readRuleClass(node: StaticRuleNode): NativeRuleClass {
  const stamped = node[NATIVE_RULE_CLASS];
  if (stamped !== undefined) return stamped;
  return classifyRuleNow(node.selectors);
}

function handleAtRule(
  node: StaticAtRuleNode,
  baseDecls: StaticDeclNode[],
  conditional: ConditionalStyle[],
  startingDecls: StaticDeclNode[]
): void {
  // Parser stamps `[NATIVE_AT_CLASS]` at construction time on native
  // builds. For AST built outside that path (jsdom-test env, or future
  // shared-AST consumers) we classify on demand: same logic, no write.
  const cls = node[NATIVE_AT_CLASS] ?? classifyAtRuleNow(node.name, node.prelude);
  const name = node.name;

  if (cls.kind === 'starting-style') {
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child.kind === NodeKind.Decl) pushDecl(startingDecls, child);
      }
    }
    return;
  }

  if (cls.kind === 'media' || cls.kind === 'container' || cls.kind === 'supports') {
    if (!node.children) return;
    // `condition` is the parse-time-cached prelude slice when the
    // prelude was static; for sentinel-bearing preludes (`@media
    // (min-width: ${size}px)`) it's null and we recover from the now-
    // filled prelude string.
    // For container at-rules, `${Component}` interpolation pre-
    // stringifies to `.sc-aBcDeF` (selector form). The classified
    // `containerName` strips the dot; mirror that here when computing
    // the condition substring so they line up against the same offset.
    const preludeForOffset =
      cls.kind === 'container' && node.prelude.charCodeAt(0) === 0x2e
        ? node.prelude.substring(1)
        : node.prelude;
    const condition =
      cls.condition !== null
        ? cls.condition
        : cls.containerName
          ? preludeForOffset.substring(cls.containerName.length).replace(/^\s+/, '')
          : preludeForOffset;
    const outer = {
      type: cls.kind,
      condition,
      containerName: cls.containerName,
    };

    // Direct declarations inside the at-rule body apply to the component itself.
    const decls = collectDecls(node.children);
    if (decls.length > 0) {
      const { base, resolvers, important, importantResolvers, varDeferred } = processDecls(decls);
      const entry: ConditionalStyle = {
        type: outer.type,
        condition: outer.condition,
        styles: base,
      };
      if (outer.containerName) entry.containerName = outer.containerName;
      entry.styles = stripSpecialCasesFromConditional(base, entry);
      attachBucketExtras(entry, resolvers, important, importantResolvers, varDeferred);
      conditional.push(entry);
    }

    // Nested rules inside the at-rule body. Emit one bucket per
    // selector, gated on BOTH the outer at-rule condition AND the
    // selector's gates (pseudo state, attribute chain, or both).
    // Unsupported selector shapes are silently dropped here; the
    // top-level "complex selector" warning only fires for top-level
    // rules.
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.kind !== NodeKind.Rule) continue;
      const childCls = readRuleClass(child);
      if (childCls.kind === 'unsupported') continue;
      applyRuleClass(child, childCls, conditional, outer);
    }
    return;
  }

  if (cls.kind === 'keyframes') {
    // Handled as KeyframesNode, this branch is reachable only for unusual cases.
    return;
  }

  if (cls.kind !== 'unsupported') return;
  const warnKind = cls.warn;
  if (__DEV__) {
    if (warnKind === 'web-only') {
      warnOnce(
        'native-at-rule-web-only',
        `@${name} is a web-only at-rule and has no React Native equivalent. The rule was ignored.`,
        name
      );
    } else {
      warnOnce(
        'native-at-rule-unknown',
        `@${name} is not supported on native. The rule was ignored.`,
        name
      );
    }
  }
  if (warnKind === 'web-only') return;

  // Fallback: still hoist direct declarations into base so simple bare at-rules don't silently lose
  // user-authored properties (e.g., at-rules that only affect the web).
  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.kind === NodeKind.Decl) pushDecl(baseDecls, child);
    }
  }
}

function collectDecls(nodes: StaticNode[]): StaticDeclNode[] {
  const out: StaticDeclNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.kind === NodeKind.Decl) pushDecl(out, node);
  }
  return out;
}

function pushDecl(out: StaticDeclNode[], node: StaticDeclNode): void {
  // Inline check (was Array.indexOf on a 3-element list; hot enough to
  // show up in cold profile despite being O(3)). Three string identity
  // compares are faster than the indexOf machinery.
  const v = node.value;
  if (v === 'fit-content' || v === 'min-content' || v === 'max-content') {
    if (__DEV__) {
      warnOnce(
        'native-unsupported-value',
        `the value "${v}" for "${node.prop}" is not supported in React Native and will be ignored.`,
        node.prop + ':' + v
      );
    }
    return;
  }
  // Push the DeclNode reference directly. One slot per decl (half of the
  // legacy [prop, value] tuple form) AND lets `processDecls` reach the
  // node's DYN flag and WeakMap-cached partial. Memory layout note: the
  // 5-7% v7 cold-compile win held by the flat-tuple shape is preserved
  // (no per-decl allocation).
  out.push(node);
}

// Two-level Map<prop, Map<value, result>>; whole-Map flush at the ceiling.
// The two levels avoid the per-call `prop + '\x1f' + value` string alloc
// that was 8-15% of cold-compile profile. Whole-flush beat per-entry FIFO
// by 3-4x in measurement; don't change without re-measuring.
//
// Working set is bounded to dynamic decls only; static Decls bypass this
// cache via `staticDeclCache` below. Capacity reduced from 1000 (legacy
// when both static and dynamic shared this Map) to 200 since dynamic
// values cycle through a much smaller set of distinct prop+value tuples.
const PAIR_CACHE_LIMIT = 200;
let pairCache = new Map<string, Map<string, Record<string, any>>>();
let pairCacheSize = 0;

/**
 * Static-Decl precompiled partials. Population is lazy (first time the
 * Decl is processed); subsequent renders splat the cached object directly,
 * skipping the camelize / shorthand / polyfill work in `transformDecl`.
 *
 * WeakMap-keyed by node identity. The Source's AST is per-RuleSet
 * WeakMap-rooted, so cached partials get freed alongside their components.
 * Per `perf_cache_layout.md` the lookup costs ~120ns per static Decl
 * versus ~60ns for a Symbol-keyed field; in production cache-miss renders
 * (~5% of all renders) the delta is below 5µs per render. WeakMap keeps
 * the AST shape unmutated, which dodges hidden-class transitions and
 * keeps native concerns out of the shared parser data structures.
 */
const staticDeclCache = new WeakMap<StaticDeclNode, Record<string, any>>();

/**
 * Public-helper entry point: backs `toStyleSheet(css\`...\`)` from the
 * native build, which produces a plain RN style object users can pass into
 * any `style=` prop without a styled wrapper. Returns the frozen,
 * StyleSheet-registered `base` only;`conditional` and `keyframes` are
 * dropped since `toStyleSheet` is a pure helper without render context.
 *
 * Production styled-component compilation goes through `toNativeStyles` /
 * `astToNativeStyles` directly; this is a thin slice on top.
 */
export function cssToStyleObject(flatCSS: string, styleSheet: StyleSheet): Dict<any> {
  return toNativeStyles(flatCSS, styleSheet).base;
}

/**
 * Extract raw `[prop, value]` pairs for top-level declarations.
 * Exported for tests; consumers should use `toNativeStyles` or
 * `cssToStyleObject` instead. Preprocessing + parser semantics apply:
 * comments stripped, malformed blocks skipped, RN_UNSUPPORTED_VALUES warn+drop.
 */
export function extractBaseDeclPairs(rawCSS: string): Array<[string, string]> {
  const preprocessed = normalize(rawCSS);
  const ast = parse(preprocessed, { keepCommaSpaces: true });
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < ast.length; i++) {
    const node = ast[i];
    if (node.kind === NodeKind.Decl) pairs.push([node.prop, node.value]);
  }
  return pairs;
}
