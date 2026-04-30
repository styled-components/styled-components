import { AtRuleNode, DeclNode, NodeKind, Node as ParserNode, Root, RuleNode } from '../parser/ast';
import { transformDecl } from '../native/transform';
import { warnIfSentinelLeak } from '../native/transform/dev';
import { buildResolver, Resolver } from '../native/transform/polyfills/resolvers';
import { parse } from '../parser/parser';
import { Dict, StyleSheet } from '../types';
import * as $ from '../utils/charCodes';
import { normalize } from '../utils/normalize';
import { fifoSet } from '../utils/fifoMap';

export const RN_UNSUPPORTED_VALUES = ['fit-content', 'min-content', 'max-content'];

export type ConditionType = 'media' | 'container' | 'supports' | 'pseudo' | 'attr';

export type PseudoState = 'hover' | 'focus' | 'pressed' | 'disabled';

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
  /** For type 'attr': the attribute name to read from props at render time. */
  attribute?: string;
  /** For type 'attr': the value to match (string compare with boolean coercion). */
  attrValue?: string;
  styles: Dict<any>;
  /**
   * Resolvers extracted from the bucket's styles (theme sentinels, viewport
   * units, env(), light-dark(), etc.). Applied at render time when the
   * bucket's condition matches.
   */
  resolvers?: Array<[string, Resolver]>;
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
  }>;
}

export interface NativeStyles {
  /** Unconditional declarations applied every render. */
  base: Dict<any>;
  /** Conditional buckets; render-time matches decide which merge onto base. */
  conditional: ConditionalStyle[];
  /** Keyframes collected for animation-adapter handoff (v7.1+). */
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
}

const KNOWN_PSEUDOS: Record<string, PseudoState> = {
  hover: 'hover',
  focus: 'focus',
  'focus-visible': 'focus',
  active: 'pressed',
  disabled: 'disabled',
};

/**
 * Special-case metadata — keys that look like styles but are read as
 * top-level props by specific React Native component types. The render
 * path uses `validOn` (component `displayName`/`name`) for a dev-only
 * warning when the surrounding styled component renders into an element
 * that won't read the prop. `source` is the CSS property the user wrote.
 */
export interface SpecialCaseMeta {
  validOn: ReadonlyArray<string>;
  source: string;
}

export const SPECIAL_CASE_PROPS: Record<string, SpecialCaseMeta> = {
  numberOfLines: { validOn: ['Text', 'TextInput', 'VirtualText'], source: 'line-clamp' },
};

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
 * is neither a CSS string nor an AST — it's the third representation the
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
export function astToNativeStyles(ast: Root, styleSheet: StyleSheet): NativeStyles {
  // Flat string array form: [prop1, value1, prop2, value2, …]. Avoids
  // allocating a 2-tuple per decl (was the dominant alloc in cold profile).
  const baseDecls: string[] = [];
  const conditional: ConditionalStyle[] = [];
  const keyframes: CompiledKeyframes[] = [];
  const startingDecls: string[] = [];

  walkRoot(ast, baseDecls, conditional, keyframes, startingDecls);

  // Conditional buckets get their own resolver extraction so theme sentinels,
  // env(), viewport / container units, and light-dark() inside `&:hover`,
  // `@media`, `&[attr]` etc. resolve at render time the same as base styles.
  for (let i = 0; i < conditional.length; i++) {
    const entry = conditional[i];
    const { base: resolvedStyles, resolvers: bucketResolvers } = extractResolvers(entry.styles);
    entry.styles = stripSpecialCasesFromConditional(resolvedStyles, entry);
    if (bucketResolvers.length > 0) entry.resolvers = bucketResolvers;
  }

  const baseRaw = baseDecls.length > 0 ? pairsToObject(baseDecls) : {};
  const { base: resolvedBase, resolvers } = extractResolvers(baseRaw);
  const specialCases = extractSpecialCases(resolvedBase);
  // Pass the resolved (static) portion through StyleSheet.create for
  // RN's shared-stylesheet registration. Dynamic values skip the sheet
  // (they're applied per-render and don't benefit from registration).
  const hasBaseStyleDecls = hasOwnKeys(resolvedBase);
  const base = hasBaseStyleDecls ? styleSheet.create({ generated: resolvedBase }).generated : {};
  const out: NativeStyles = { base, conditional, keyframes };
  if (specialCases !== null) out.specialCases = specialCases;
  if (startingDecls.length > 0) {
    // @starting-style decls are applied on the first render by the v7.1
    // animation adapter. Run resolvers here so theme sentinels / env() /
    // viewport units inside `@starting-style { … }` are render-time
    // resolvable just like base + conditional buckets.
    const startingRaw = pairsToObject(startingDecls);
    const { base: resolvedStarting, resolvers: startingResolvers } = extractResolvers(startingRaw);
    out.startingStyle = resolvedStarting;
    if (startingResolvers.length > 0) out.startingStyleResolvers = startingResolvers;
  }
  if (resolvers.length > 0) {
    out.resolvers = resolvers;
  }
  return out;
}

/**
 * Pull special-case keys out of the resolved base style object. Mutates
 * `base` to remove the lifted keys; returns the lifted bag (or `null` if
 * none). Called after `extractResolvers` so the values are static (no
 * theme sentinels / env() — only the polyfills that emit primitives can
 * produce these keys).
 */
function extractSpecialCases(base: Dict<any>): Dict<any> | null {
  let lifted: Dict<any> | null = null;
  for (const k in base) {
    if (SPECIAL_CASE_PROPS[k] !== undefined) {
      if (lifted === null) lifted = {};
      lifted[k] = base[k];
      delete base[k];
    }
  }
  return lifted;
}

function describeCondition(entry: ConditionalStyle): string {
  if (entry.type === 'pseudo') return ':' + entry.condition;
  if (entry.type === 'attr') {
    return entry.attrValue !== undefined
      ? `[${entry.attribute}="${entry.attrValue}"]`
      : `[${entry.attribute}]`;
  }
  // media / container / supports: type + prelude
  return `@${entry.type} ${entry.condition}`;
}

/**
 * Special-case props inside conditional rules (media query, container
 * query, pseudo, attribute selector) aren't yet routed through the
 * per-render prop merge — only top-level uses are. Drop them with a
 * dev warning so the bucket's style payload stays correct and the user
 * knows the construct silently no-ops.
 */
function stripSpecialCasesFromConditional(styles: Dict<any>, entry: ConditionalStyle): Dict<any> {
  let out: Dict<any> | null = null;
  for (const k in styles) {
    if (SPECIAL_CASE_PROPS[k] !== undefined) {
      if (process.env.NODE_ENV !== 'production') {
        const meta = SPECIAL_CASE_PROPS[k];
        // eslint-disable-next-line no-console
        console.warn(
          `\`${meta.source}\` is not supported inside \`${describeCondition(entry)}\` on ` +
            `React Native. \`${meta.source}\` maps to React Native's \`${k}\` prop on ` +
            `<${meta.validOn[0]}>, which can't change per condition. ` +
            `Move \`${meta.source}\` to the top level of your styled component.`
        );
      }
      if (out === null) out = { ...styles };
      delete out[k];
    }
  }
  return out ?? styles;
}

function hasOwnKeys(o: object): boolean {
  for (const k in o) {
    if (k.length >= 0) return true;
  }
  return false;
}

function extractResolvers(raw: Dict<any>): {
  base: Dict<any>;
  resolvers: Array<[string, Resolver]>;
} {
  const base: Dict<any> = {};
  const resolvers: Array<[string, Resolver]> = [];
  for (const k in raw) {
    const v = raw[k];
    const r = buildResolver(v);
    if (r !== null) {
      resolvers.push([k, r]);
    } else {
      if (process.env.NODE_ENV !== 'production') {
        warnIfSentinelLeak(k, v);
      }
      base[k] = v;
    }
  }
  return { base, resolvers };
}

function walkRoot(
  nodes: ParserNode[],
  baseDecls: string[],
  conditional: ConditionalStyle[],
  keyframes: CompiledKeyframes[],
  startingDecls: string[]
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
          // Mirror the base/conditional pipeline: flat decls → transformDecl
          // (via pairsToObject) → extractResolvers. Lets `${t.colors.x}`
          // and `env()` inside a keyframe's declarations resolve at
          // render time when the v7.1 animation adapter applies them.
          const flat: string[] = [];
          for (let j = 0; j < frame.children.length; j++) {
            const d = frame.children[j];
            flat.push(d.prop, d.value);
          }
          const raw = flat.length > 0 ? pairsToObject(flat) : {};
          const { base, resolvers } = extractResolvers(raw);
          const out: { stops: string[]; decls: Dict<any>; resolvers?: Array<[string, Resolver]> } =
            { stops: frame.stops, decls: base };
          if (resolvers.length > 0) out.resolvers = resolvers;
          return out;
        }),
      });
    }
  }
}

function handleRootRule(node: RuleNode, conditional: ConditionalStyle[]): void {
  const pseudo = detectPseudo(node.selectors);
  if (pseudo) {
    const decls = collectDecls(node.children);
    if (decls.length === 0) return;
    conditional.push({
      type: 'pseudo',
      condition: pseudo,
      styles: pairsToObject(decls),
    });
    return;
  }

  // Polyfill: &:is(:state1, :state2, …) and &:where(...) fan out into
  // N parallel pseudo buckets so `&:is(:hover, :focus)` produces the
  // same styles regardless of which state is active. Top-level comma
  // form (`&:focus, &:focus-visible`) gets the same treatment.
  const fanOut = detectIsWhereStates(node.selectors) || detectMultiPseudo(node.selectors);
  if (fanOut) {
    const decls = collectDecls(node.children);
    if (decls.length === 0) return;
    const styles = pairsToObject(decls);
    for (let i = 0; i < fanOut.length; i++) {
      conditional.push({ type: 'pseudo', condition: fanOut[i], styles });
    }
    return;
  }

  // `&[attr]` / `&[attr=value]`: evaluate against props at render time.
  const attr = detectAttr(node.selectors);
  if (attr) {
    const decls = collectDecls(node.children);
    if (decls.length === 0) return;
    const entry: ConditionalStyle = {
      type: 'attr',
      condition: attr.attribute,
      attribute: attr.attribute,
      styles: pairsToObject(decls),
    };
    if (attr.value !== undefined) entry.attrValue = attr.value;
    conditional.push(entry);
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      `[styled-components/native] Complex selectors are not supported yet (received: ${node.selectors.join(
        ', '
      )}). Only pseudo-state selectors (\`&:hover\`, \`&:focus\`, \`&:focus-visible\`, \`&:active\`, \`&:disabled\`), attribute selectors (\`&[aria-pressed]\`, \`&[aria-pressed='true']\`), and \`&:is(...)\` / \`&:where(...)\` enumerations of pseudo states are supported on native. The rule was ignored.`
    );
  }
}

function handleAtRule(
  node: AtRuleNode,
  baseDecls: string[],
  conditional: ConditionalStyle[],
  startingDecls: string[]
): void {
  const name = node.name;

  if (name === 'starting-style') {
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child.kind === NodeKind.Decl) pushDecl(startingDecls, child);
      }
    }
    return;
  }

  if (name === 'media' || name === 'container' || name === 'supports') {
    if (!node.children) return;
    const containerName = name === 'container' ? extractContainerName(node.prelude) : undefined;
    const condition = containerName
      ? node.prelude.substring(containerName.length).replace(/^\s+/, '')
      : node.prelude;

    // Direct declarations inside the at-rule body apply to the component itself.
    const decls = collectDecls(node.children);
    if (decls.length > 0) {
      const entry: ConditionalStyle = {
        type: name,
        condition,
        styles: pairsToObject(decls),
      };
      if (containerName) entry.containerName = containerName;
      conditional.push(entry);
    }

    // Pseudo-state rules nested inside at-rules: emit a bucket that's gated
    // on BOTH the outer condition AND the pseudo-state.
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.kind !== NodeKind.Rule) continue;
      const pseudo = detectPseudo(child.selectors);
      if (!pseudo) continue;
      const childDecls = collectDecls(child.children);
      if (childDecls.length === 0) continue;
      const entry: ConditionalStyle = {
        type: name,
        condition,
        pseudo,
        styles: pairsToObject(childDecls),
      };
      if (containerName) entry.containerName = containerName;
      conditional.push(entry);
    }
    return;
  }

  if (name === 'keyframes' || /^-[a-z]+-keyframes$/.test(name)) {
    // Handled as KeyframesNode, this branch is reachable only for unusual cases.
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    if (name === 'font-face' || name === 'property' || name === 'page') {
      // These at-rules have no native counterpart. Silently drop in prod, warn in dev once per parse.
      console.warn(
        `[styled-components/native] @${name} is a web-only at-rule and has no React Native equivalent. The rule was ignored.`
      );
      return;
    }

    console.warn(
      `[styled-components/native] @${name} is not supported on native. The rule was ignored.`
    );
  }

  // Fallback: still hoist direct declarations into base so simple bare at-rules don't silently lose
  // user-authored properties (e.g., at-rules that only affect the web).
  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.kind === NodeKind.Decl) pushDecl(baseDecls, child);
    }
  }
}

function collectDecls(nodes: ParserNode[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.kind === NodeKind.Decl) pushDecl(out, node);
  }
  return out;
}

function pushDecl(out: string[], node: DeclNode): void {
  // Inline check (was Array.indexOf on a 3-element list; hot enough to
  // show up in cold profile despite being O(3)). Three string identity
  // compares are faster than the indexOf machinery.
  const v = node.value;
  if (v === 'fit-content' || v === 'min-content' || v === 'max-content') {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[styled-components/native] The value "${v}" for property "${node.prop}" is not supported in React Native and will be ignored.`
      );
    }
    return;
  }
  // Push prop and value as siblings in a flat array. Saves a 2-tuple
  // allocation per decl vs the prior `[prop, value]` shape; measurable
  // 5-7% cold-path win on medium/large CSS.
  out.push(node.prop, v);
}

function detectPseudoSelector(sel: string): PseudoState | null {
  // Match `&:<pseudo>`; the only native-supported selector shape in v7.0.
  if (sel.length < 3 || sel.charCodeAt(0) !== $.AMPERSAND || sel.charCodeAt(1) !== $.COLON) {
    return null;
  }
  const name = sel.substring(2);
  return KNOWN_PSEUDOS[name] || null;
}

function detectPseudo(selectors: string[]): PseudoState | null {
  if (selectors.length !== 1) return null;
  return detectPseudoSelector(selectors[0]);
}

/**
 * Top-level comma-separated pseudo selectors (`&:focus, &:focus-visible`) are
 * sugar for `&:is(:focus, :focus-visible)`. Fan out when every comma-fragment
 * is a known pseudo state.
 */
function detectMultiPseudo(selectors: string[]): PseudoState[] | null {
  if (selectors.length < 2) return null;
  const states: PseudoState[] = [];
  for (let i = 0; i < selectors.length; i++) {
    const s = detectPseudoSelector(selectors[i]);
    if (s === null) return null;
    states.push(s);
  }
  return states;
}

/**
 * Expand `&:is(:state1, :state2, …)` and `&:where(...)` into the set of
 * individual pseudo-states covered by the argument list. Returns the
 * matched states or `null` if the selector isn't a pseudo-enumeration
 * pattern we can polyfill.
 *
 * Polyfill: CSS Selectors L4 `:is` / `:where` are non-existent on RN —
 * no selector engine. But when every argument is a known pseudo-state,
 * we can emit N parallel pseudo buckets with the same decls, which is
 * semantically equivalent (union-of-states in the state-predicate sense).
 */
function detectIsWhereStates(selectors: string[]): PseudoState[] | null {
  if (selectors.length !== 1) return null;
  const sel = selectors[0];
  // `&:is(...)` or `&:where(...)`
  if (sel.charCodeAt(0) !== $.AMPERSAND || sel.charCodeAt(1) !== $.COLON) {
    return null;
  }
  const rest = sel.substring(2);
  let fnName: string;
  if (rest.startsWith('is(')) fnName = 'is';
  else if (rest.startsWith('where(')) fnName = 'where';
  else return null;

  const openParen = fnName.length;
  if (sel.charCodeAt(2 + openParen) !== $.OPEN_PAREN) return null;
  const closeParen = sel.lastIndexOf(')');
  if (closeParen === -1) return null;
  const inner = sel.substring(2 + openParen + 1, closeParen);

  const states: PseudoState[] = [];
  const parts = inner.split(',');
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].trim();
    if (p.charCodeAt(0) !== $.COLON) return null;
    const name = p.substring(1);
    const mapped = KNOWN_PSEUDOS[name];
    if (!mapped) return null;
    states.push(mapped);
  }
  return states.length > 0 ? states : null;
}

/** `&[attr]` (presence) or `&[attr=value]` (exact). `=` operator only. */
function detectAttr(selectors: string[]): { attribute: string; value?: string } | null {
  if (selectors.length !== 1) return null;
  const sel = selectors[0];
  if (
    sel.length < 4 ||
    sel.charCodeAt(0) !== $.AMPERSAND ||
    sel.charCodeAt(1) !== $.OPEN_BRACKET ||
    sel.charCodeAt(sel.length - 1) !== $.CLOSE_BRACKET
  ) {
    return null;
  }
  const inner = sel.substring(2, sel.length - 1);
  const eqIdx = inner.indexOf('=');
  if (eqIdx === -1) {
    const name = inner.trim();
    return isAttrName(name) ? { attribute: name } : null;
  }
  if (eqIdx > 0) {
    const before = inner.charCodeAt(eqIdx - 1);
    if (
      before === $.TILDE ||
      before === $.PIPE ||
      before === 0x5e /* ^ */ ||
      before === 0x24 /* $ */ ||
      before === $.ASTERISK
    ) {
      return null;
    }
  }
  const name = inner.substring(0, eqIdx).trim();
  if (!isAttrName(name)) return null;
  let raw = inner.substring(eqIdx + 1).trim();
  if (raw.length >= 2 && raw.charCodeAt(raw.length - 2) === $.SPACE) {
    const flag = raw.charCodeAt(raw.length - 1);
    if (flag === 0x69 || flag === 0x73 || flag === 0x49 || flag === 0x53) {
      raw = raw.substring(0, raw.length - 2).trim();
    }
  }
  let value = raw;
  if (value.length >= 2) {
    const first = value.charCodeAt(0);
    const last = value.charCodeAt(value.length - 1);
    if (
      (first === $.SINGLE_QUOTE && last === $.SINGLE_QUOTE) ||
      (first === $.DOUBLE_QUOTE && last === $.DOUBLE_QUOTE)
    ) {
      value = value.substring(1, value.length - 1);
    }
  }
  return { attribute: name, value };
}

function isAttrName(name: string): boolean {
  if (name.length === 0) return false;
  for (let i = 0; i < name.length; i++) {
    const c = name.charCodeAt(i);
    const ok =
      (c >= $.LOWER_A && c <= $.LOWER_Z) ||
      (c >= $.UPPER_A && c <= $.UPPER_Z) ||
      (c >= $.DIGIT_0 && c <= $.DIGIT_9) ||
      c === $.HYPHEN ||
      c === $.UNDERSCORE ||
      c === $.COLON;
    if (!ok) return false;
  }
  return true;
}

/**
 * Extract an optional container name from an `@container` prelude.
 * `card (min-width: 400px)` → `card`. Bare `(min-width: 400px)` → `undefined`.
 */
function extractContainerName(prelude: string): string | undefined {
  const firstChar = prelude.charCodeAt(0);
  if (firstChar === $.OPEN_PAREN) return undefined;
  let i = 0;
  while (i < prelude.length) {
    const c = prelude.charCodeAt(i);
    if (c === $.SPACE || c === $.TAB || c === $.OPEN_PAREN) break;
    i++;
  }
  return prelude.substring(0, i);
}

// Two-level Map<prop, Map<value, result>>; whole-Map flush at the ceiling.
// The two levels avoid the per-call `prop + '\x1f' + value` string alloc
// that was 8-15% of cold-compile profile. Whole-flush beat per-entry FIFO
// by 3-4x in measurement; don't change without re-measuring.
const PAIR_CACHE_LIMIT = 1000;
let pairCache = new Map<string, Map<string, Record<string, any>>>();
let pairCacheSize = 0;

function transformPair(prop: string, value: string): Record<string, any> {
  let inner = pairCache.get(prop);
  if (inner !== undefined) {
    const hit = inner.get(value);
    if (hit !== undefined) return hit;
  }
  const partial = transformDecl(prop, value);
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
  return partial;
}

/**
 * Iterate a flat `[prop1, value1, prop2, value2, …]` array, transforming
 * each pair and merging into the output dict. The flat-array shape is
 * 5-7% faster cold-compile than tuple-of-tuples (no per-decl alloc).
 */
function pairsToObject(pairs: string[]): Dict<any> {
  const out: Dict<any> = {};
  for (let i = 0; i < pairs.length; i += 2) {
    const partial = transformPair(pairs[i], pairs[i + 1]);
    for (const k in partial) out[k] = partial[k];
  }
  return out;
}

/**
 * Public-helper entry point: backs `toStyleSheet(css\`...\`)` from the
 * native build, which produces a plain RN style object users can pass into
 * any `style=` prop without a styled wrapper. Returns the frozen,
 * StyleSheet-registered `base` only — `conditional` and `keyframes` are
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
