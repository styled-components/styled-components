/**
 * Experimental rn-web bridge. Routes `styled-components/native` consumers
 * running under react-native-web through the web pipeline (CSSOM
 * insertRule, hashed className output) instead of building an RN style
 * object that react-native-web then re-tokenizes back into atomic CSS.
 *
 * Two pipelines doing the same work was the win to delete; the small
 * trick that makes it possible is styleq's `$$css` escape hatch. We
 * wrap each rn-web primitive in a shim that converts the className
 * the web `styled` factory hands it into a `{ $$css: true, sc: cls }`
 * style entry; rn-web composes that into its DOM className alongside
 * its own atomic classes.
 *
 * The bridged surface mirrors `styled-components/native`'s alias list,
 * lifted to whichever components rn-web actually exports at runtime.
 * Web-native HTML elements (`styled.a`, `styled.select`, `styled.div`,
 * etc.) and arbitrary `styled(Component)` calls work for free because
 * the underlying factory is the web `styled` — only the rn-web
 * primitives need the `$$css` shim.
 *
 * @see ../../test/rn-web-contract.test.tsx — locks the $$css contract
 */

import * as React from 'react';

// Side-effect: opt the document into both color schemes so
// `light-dark()` resolves to its dark argument under OS preference and
// `useColorScheme()` reflects the OS choice. Without this opt-in the
// browser locks the document to light for legacy compatibility, and
// `matchMedia('(prefers-color-scheme: dark)')` reports false even on
// dark systems, which propagates through React Native Web's
// `useColorScheme()` into every theme-aware component. Set as an
// inline style on `<html>` so it beats anything a host stylesheet
// declares at lower specificity. The `if (!colorScheme)` guard
// preserves an explicit author choice (e.g.
// `style="color-scheme: only light"` to force light).
if (typeof document !== 'undefined') {
  const docEl = document.documentElement;
  if (docEl && !docEl.style.colorScheme) {
    docEl.style.colorScheme = 'light dark';
  }
}

// react-native ships its own types; react-native-web is the runtime
// substrate when the host bundler maps `react-native` → `react-native-web`.
// rn-web mirrors RN's component API so the types apply cleanly.
import type {
  ActivityIndicator as RNActivityIndicator,
  Button as RNButton,
  FlatList as RNFlatList,
  Image as RNImage,
  ImageBackground as RNImageBackground,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Modal as RNModal,
  Pressable as RNPressable,
  RefreshControl as RNRefreshControl,
  SafeAreaView as RNSafeAreaView,
  ScrollView as RNScrollView,
  SectionList as RNSectionList,
  StatusBar as RNStatusBar,
  Switch as RNSwitch,
  Text as RNText,
  TextInput as RNTextInput,
  TouchableHighlight as RNTouchableHighlight,
  TouchableOpacity as RNTouchableOpacity,
  TouchableWithoutFeedback as RNTouchableWithoutFeedback,
  View as RNView,
  VirtualizedList as RNVirtualizedList,
} from 'react-native';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const reactNativeWeb = require('react-native-web') as Record<string, unknown>;

import styledWeb from '../../constructors/styled';
import createTheme from '../../constructors/createTheme';
import RawThemeProvider, {
  ThemeConsumer,
  ThemeContext,
  useTheme,
} from '../../models/ThemeProvider';
import css from '../../constructors/css';
import keyframes from '../../constructors/keyframes';
import createGlobalStyle from '../../constructors/createGlobalStyle';
import withTheme from '../../hoc/withTheme';
import isStyledComponent from '../../utils/isStyledComponent';
import { mainCompiler, StyleSheetManager } from '../../models/StyleSheetManager';
import ServerStyleSheet from '../../models/ServerStyleSheet';
import { camelize } from '../transform';
import type { Styled } from '../../constructors/constructWithOptions';

type BridgedProps = {
  className?: string;
  style?: unknown;
  [key: string]: unknown;
};

/**
 * rn-web's `preprocess.js` emits `matrix(${vals.join(',')})` for
 * `transform: [{matrix: [...]}]` regardless of element count. With a
 * 16-element matrix the result is `matrix(a, b, c, ..., p)` which
 * isn't valid CSS — `matrix()` takes 6 args, `matrix3d()` takes 16.
 * The browser drops the entire `transform` declaration as invalid,
 * collapsing 3D transforms (every face stacks at origin).
 *
 * Rewrite 16-element matrix entries to `matrix3d` before rn-web's
 * preprocess sees them so the right CSS function name is emitted.
 */
function rewrite3dMatrices(style: unknown): unknown {
  if (style == null || typeof style !== 'object') return style;
  if (Array.isArray(style)) {
    let changed = false;
    const out = new Array<unknown>(style.length);
    for (let i = 0; i < style.length; i++) {
      const before = style[i];
      const after = rewrite3dMatrices(before);
      if (after !== before) changed = true;
      out[i] = after;
    }
    return changed ? out : style;
  }
  const obj = style as Record<string, unknown>;
  const t = obj.transform;
  if (!Array.isArray(t)) return style;
  let changed = false;
  const rewritten = new Array<unknown>(t.length);
  for (let i = 0; i < t.length; i++) {
    const entry = t[i];
    if (
      entry != null &&
      typeof entry === 'object' &&
      Array.isArray((entry as { matrix?: unknown[] }).matrix) &&
      (entry as { matrix: unknown[] }).matrix.length === 16
    ) {
      changed = true;
      rewritten[i] = { matrix3d: (entry as { matrix: unknown[] }).matrix };
    } else {
      rewritten[i] = entry;
    }
  }
  return changed ? { ...obj, transform: rewritten } : style;
}

/**
 * Convert any `data-*` props on the bridge shim into rn-web's
 * `dataSet={{ ... }}` API. rn-web's `createDOMProps` strips raw
 * `data-*` props from its View output and only re-emits them when
 * passed through `dataSet`; without this translation, attribute
 * selectors like `&[data-foo='bar']` in styled CSS never match
 * because the attribute never reaches the DOM.
 *
 * Kebab-case suffixes are camelCased into the dataSet object so the
 * downstream hyphenation in rn-web's createDOMProps produces the
 * original `data-foo-bar` attribute on the DOM node.
 */
function collectDataProps(rest: Record<string, unknown>): {
  dataSet: Record<string, unknown> | undefined;
  other: Record<string, unknown>;
} {
  let dataSet: Record<string, unknown> | undefined;
  const other: Record<string, unknown> = {};
  for (const key in rest) {
    if (key.startsWith('data-')) {
      if (dataSet === undefined) dataSet = {};
      // `data-place-self` → `placeSelf` via the shared camelize cache.
      dataSet[camelize(key.slice(5))] = rest[key];
    } else {
      other[key] = rest[key];
    }
  }
  if (dataSet !== undefined && rest.dataSet && typeof rest.dataSet === 'object') {
    // Fold any explicit dataSet provided by the caller; explicit wins.
    Object.assign(dataSet, rest.dataSet);
  }
  return { dataSet, other };
}

/**
 * Wrap a rn-web primitive so the web pipeline's `className` prop becomes a
 * styleq `$$css` entry in `style`. rn-web's createDOMProps reads `style`
 * exclusively for className generation, so we must deliver our class
 * through `style` to land on the DOM.
 */
function bridgePrimitive<P extends BridgedProps>(
  Component: React.ComponentType<P>,
  displayName: string
): React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<unknown>> {
  const Bridged = React.forwardRef<unknown, P>((props, ref) => {
    // `pointerEvents` is destructured off (not deleted) because rn-web
    // deprecates the prop in favor of `style.pointerEvents`. Values
    // `auto | none | box-none | box-only` pass through identically to
    // rn-web's own `pointerEventsStyles` map.
    const { className, style, pointerEvents, ...rest } = props as P & {
      pointerEvents?: unknown;
    };
    const fixedStyle = rewrite3dMatrices(style);
    const classLayer = className ? { $$css: true, sc: className } : null;
    const pointerLayer = pointerEvents != null ? { pointerEvents } : null;
    let finalStyle: unknown = fixedStyle;
    if (classLayer || pointerLayer) {
      const layers: unknown[] = [];
      if (classLayer) layers.push(classLayer);
      if (Array.isArray(fixedStyle)) layers.push(...fixedStyle);
      else if (fixedStyle != null) layers.push(fixedStyle);
      if (pointerLayer) layers.push(pointerLayer);
      finalStyle = layers;
    }
    const { dataSet, other } = collectDataProps(rest as Record<string, unknown>);
    const finalProps: Record<string, unknown> = { ...other, ref, style: finalStyle };
    if (dataSet !== undefined) finalProps.dataSet = dataSet;
    return React.createElement(Component, finalProps as unknown as P);
  });
  Bridged.displayName = displayName;
  return Bridged;
}

/**
 * Full rn-web alias surface that the native entry exposes. The bridge
 * mirrors it so consumers swapping `styled-components/native` for the
 * bridge subpath see the same primitives. Each alias is constructed
 * lazily on first access (matches the native entry's `Object.defineProperty`
 * pattern) so unused primitives stay tree-shake-friendly.
 *
 * Aliases not present in the installed rn-web build throw on access
 * with a developer-readable message, matching native-entry behavior.
 */
const aliases = [
  'ActivityIndicator',
  'Button',
  'FlatList',
  'Image',
  'ImageBackground',
  'KeyboardAvoidingView',
  'Modal',
  'Pressable',
  'RefreshControl',
  'SafeAreaView',
  'ScrollView',
  'SectionList',
  'StatusBar',
  'Switch',
  'Text',
  'TextInput',
  'TouchableHighlight',
  'TouchableOpacity',
  'TouchableWithoutFeedback',
  'View',
  'VirtualizedList',
] as const;

type KnownAlias = (typeof aliases)[number];

type BridgedNamespace = {
  ActivityIndicator: Styled<
    'web',
    typeof RNActivityIndicator,
    React.ComponentPropsWithRef<typeof RNActivityIndicator>
  >;
  Button: Styled<'web', typeof RNButton, React.ComponentPropsWithRef<typeof RNButton>>;
  FlatList: Styled<'web', typeof RNFlatList, React.ComponentPropsWithRef<typeof RNFlatList>>;
  Image: Styled<'web', typeof RNImage, React.ComponentPropsWithRef<typeof RNImage>>;
  ImageBackground: Styled<
    'web',
    typeof RNImageBackground,
    React.ComponentPropsWithRef<typeof RNImageBackground>
  >;
  KeyboardAvoidingView: Styled<
    'web',
    typeof RNKeyboardAvoidingView,
    React.ComponentPropsWithRef<typeof RNKeyboardAvoidingView>
  >;
  Modal: Styled<'web', typeof RNModal, React.ComponentPropsWithRef<typeof RNModal>>;
  Pressable: Styled<'web', typeof RNPressable, React.ComponentPropsWithRef<typeof RNPressable>>;
  RefreshControl: Styled<
    'web',
    typeof RNRefreshControl,
    React.ComponentPropsWithRef<typeof RNRefreshControl>
  >;
  SafeAreaView: Styled<
    'web',
    typeof RNSafeAreaView,
    React.ComponentPropsWithRef<typeof RNSafeAreaView>
  >;
  ScrollView: Styled<'web', typeof RNScrollView, React.ComponentPropsWithRef<typeof RNScrollView>>;
  SectionList: Styled<
    'web',
    typeof RNSectionList,
    React.ComponentPropsWithRef<typeof RNSectionList>
  >;
  StatusBar: Styled<'web', typeof RNStatusBar, React.ComponentPropsWithRef<typeof RNStatusBar>>;
  Switch: Styled<'web', typeof RNSwitch, React.ComponentPropsWithRef<typeof RNSwitch>>;
  Text: Styled<'web', typeof RNText, React.ComponentPropsWithRef<typeof RNText>>;
  TextInput: Styled<'web', typeof RNTextInput, React.ComponentPropsWithRef<typeof RNTextInput>>;
  TouchableHighlight: Styled<
    'web',
    typeof RNTouchableHighlight,
    React.ComponentPropsWithRef<typeof RNTouchableHighlight>
  >;
  TouchableOpacity: Styled<
    'web',
    typeof RNTouchableOpacity,
    React.ComponentPropsWithRef<typeof RNTouchableOpacity>
  >;
  TouchableWithoutFeedback: Styled<
    'web',
    typeof RNTouchableWithoutFeedback,
    React.ComponentPropsWithRef<typeof RNTouchableWithoutFeedback>
  >;
  View: Styled<'web', typeof RNView, React.ComponentPropsWithRef<typeof RNView>>;
  VirtualizedList: Styled<
    'web',
    typeof RNVirtualizedList,
    React.ComponentPropsWithRef<typeof RNVirtualizedList>
  >;
};

// `styled` is the bridge's main export. Setup runs further down once
// `allLifts`, baselines, etc. are defined; we declare the reference
// here so it can be exported below.
let styled: typeof styledWeb & BridgedNamespace;

/**
 * Per-alias baseline styles. Pressable renders as `<div>` (or
 * `<button>` when a role is set) on rn-web and inherits the default
 * text cursor; users can't tell at a glance which elements are
 * interactive. The baseline restores web affordance. Authored CSS in
 * downstream components overrides as usual.
 */
const baselineCss: Partial<Record<KnownAlias, string>> = {
  Pressable: 'cursor: pointer;',
};

/**
 * CSS-to-prop lifts for primitives whose rn-web rendering doesn't
 * pick up the spec CSS surface. rn-web abstracts the HTML element
 * away (Image renders as `<div>` with background-image, Switch as a
 * custom div/span tree), so declarations like `object-fit` or
 * `accent-color` reach the CSSOM but have no visual effect on the
 * rendered output. The lift mirrors what the native engine's
 * `SPECIAL_CASE_PROPS` mechanism did at compile time: pull the value
 * out of the authored CSS, hand it to rn-web as the component prop
 * that the component actually consumes.
 *
 * Limitations:
 * - Static values only. Dynamic interpolations (e.g.
 *   `object-fit: ${p => p.$fit}`) aren't lifted; consumers needing
 *   dynamic values should pass `resizeMode={...}` / `trackColor={...}`
 *   directly as props on the rendered element.
 * - Modern color functions (`oklch()`, `color-mix()`, etc.) that
 *   reach rn-web's `normalizeColor` are normalized to `transparent`.
 *   The bridge ships the value verbatim; consumers wanting modern
 *   color support on a lifted prop need to author with hex / rgb /
 *   hsl until rn-web's color subset catches up to CSS Color 4.
 */
type CssLiftMap = Record<string, { prop: string; transform?: (v: string) => unknown }>;

// One RegExp per CSS property name, materialized on first lookup. Each
// regex matches `<prop>:<value>` at the start of a decl or after `;`/`{`/
// whitespace so longer identifiers (`-webkit-object-fit`) don't false-match.
const liftRegexCache = new Map<string, RegExp>();
function liftRegex(cssProp: string): RegExp {
  let re = liftRegexCache.get(cssProp);
  if (re === undefined) {
    const escaped = cssProp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    re = new RegExp('(?:^|[;{\\s])' + escaped + '\\s*:\\s*([^;}\\n]+)', 'i');
    liftRegexCache.set(cssProp, re);
  }
  return re;
}

const imageLifts: CssLiftMap = {
  'object-fit': {
    prop: 'resizeMode',
    transform: v => {
      // CSS Images 3 §5.5 → rn-web Image.resizeMode enum.
      // `fill` stretches without preserving aspect (`stretch` on rn-web).
      // `none` displays the intrinsic size (`center` on rn-web is the
      // nearest analog: no scaling, anchored at center).
      // `scale-down` collapses to `contain` since rn-web has no
      // direct analog — both keep aspect and never upscale past the
      // intrinsic size when the image fits the box.
      if (v === 'fill') return 'stretch';
      if (v === 'none') return 'center';
      if (v === 'scale-down') return 'contain';
      return v;
    },
  },
};

/**
 * Canonicalize any browser-recognized color value to the
 * `rgba(r, g, b, a)` form that rn-web's
 * `@react-native/normalize-colors` accepts. Paint the value onto a
 * 1×1 canvas and read back the resulting pixel — modern color
 * functions (`oklch()`, `color-mix()`, `lab()`, `oklab()`, `lch()`,
 * `hwb()`) flow through the actual paint pipeline so the result is
 * always rgba.
 *
 * Caveats:
 * - `AccentColor` system color and `accent-color: auto` both depend
 *   on the form-control context to resolve their actual value;
 *   canvas has no such context and falls back to black. We special-
 *   case those to a sensible cross-platform default (Chrome's
 *   internal blue) instead of letting them paint as black.
 * - `getComputedStyle().accentColor` would seem like an alternative,
 *   but Chrome preserves modern color function syntax in computed
 *   style and keeps `auto` as a keyword — both still rejected by
 *   rn-web's normalizer.
 *
 * Resolved once at construction time; the resolved value is captured
 * into the styled-component's attrs.
 */
let __bridgeColorCanvas: CanvasRenderingContext2D | null | undefined;
// Chrome's default form-control accent (close to the spec's
// recommended UA default). Used when the input is `auto` or
// `AccentColor` and the browser has no system accent to substitute.
const BRIDGE_ACCENT_AUTO_FALLBACK = 'rgba(0, 95, 184, 1)';
function canonicalizeColor(input: string): string {
  if (typeof document === 'undefined') return input;
  if (input === 'auto' || input === 'AccentColor') return BRIDGE_ACCENT_AUTO_FALLBACK;
  if (__bridgeColorCanvas === undefined) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      // `willReadFrequently` opts into a software-backed canvas so
      // repeated `getImageData()` reads don't pay the GPU-readback
      // cost (Canvas2D spec note). Browsers also stop warning about
      // hot getImageData loops once the flag is set.
      __bridgeColorCanvas = canvas.getContext('2d', { willReadFrequently: true });
    } catch {
      __bridgeColorCanvas = null;
    }
  }
  if (__bridgeColorCanvas === null) return input;
  try {
    __bridgeColorCanvas.clearRect(0, 0, 1, 1);
    __bridgeColorCanvas.fillStyle = '#000';
    __bridgeColorCanvas.fillStyle = input;
    __bridgeColorCanvas.fillRect(0, 0, 1, 1);
  } catch {
    return input;
  }
  const data = __bridgeColorCanvas.getImageData(0, 0, 1, 1).data;
  const r = data[0];
  const g = data[1];
  const b = data[2];
  const a = data[3] / 255;
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
}

const textLifts: CssLiftMap = {
  // CSS Text 4 `text-wrap: nowrap`. rn-web's Text only applies its
  // `textOneLine` baseline (`white-space: nowrap; text-overflow:
  // ellipsis`) when `numberOfLines={1}`; without it, authored
  // `text-wrap: nowrap` reaches the DOM but the Text element's
  // default `pre-wrap` whitespace handling wins anyway. The lift
  // matches the native engine's `SPECIAL_CASE_PROPS` mapping.
  // Authored `text-overflow: clip` still works through source-order
  // specificity, overriding rn-web's baseline ellipsis.
  'text-wrap': {
    prop: 'numberOfLines',
    transform: v => (v === 'nowrap' ? 1 : undefined),
  },
  // CSS Overflow 4 `line-clamp: <integer>`. rn-web's Text already
  // emits the webkit-line-clamp triple (display: -webkit-box;
  // -webkit-box-orient: vertical; -webkit-line-clamp: N; overflow:
  // hidden) when `numberOfLines` is set, so the lift just routes the
  // integer there. Authored CSS `line-clamp: 2` survives in the
  // rule too, which the browser now ignores in favor of rn-web's
  // -webkit-* triple. Map iteration order is preserved: `line-clamp`
  // wins over `text-wrap: nowrap` if both are declared since it's
  // the more specific intent.
  'line-clamp': {
    prop: 'numberOfLines',
    transform: v => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) && n > 0 ? n : 1;
    },
  },
};

const textInputLifts: CssLiftMap = {
  // CSS Form Control Styling 1 §7.1 `field-sizing: content`. The
  // browser only honors it on `<textarea>` (and a few input types)
  // for height auto-grow; rn-web's TextInput only renders to
  // `<textarea>` when `multiline={true}`. The lift flips multiline
  // on so the authored CSS actually has a target. Other field-sizing
  // values (`fixed`, `auto`) are no-ops — leave them alone.
  'field-sizing': {
    prop: 'multiline',
    transform: v => (v === 'content' ? true : undefined),
  },
};

const switchLifts: CssLiftMap = {
  'accent-color': {
    prop: 'trackColor',
    // rn-web Switch only consumes color via its `trackColor.true` /
    // `trackColor.false` prop; CSS `accent-color` doesn't reach the
    // custom-rendered control. Also, rn-web's `normalizeColor` only
    // recognizes hex / rgb / hsl / hwb / named colors; oklch / lab /
    // color-mix / system colors / `auto` all silently fold to
    // undefined. Canonicalize via the browser's canvas2d parser so
    // we hand rn-web a value it understands.
    transform: v => {
      const canonical = canonicalizeColor(v);
      return { true: canonical, false: canonical };
    },
  },
};

const liftsByAlias: Partial<Record<KnownAlias, CssLiftMap>> = {
  Image: imageLifts,
  ImageBackground: imageLifts,
  Switch: switchLifts,
  Text: textLifts,
  TextInput: textInputLifts,
};

/**
 * Union of every per-primitive lift. Applied to every `styled(Component)`
 * call (including extensions like `styled(MyText)` that wrap a bridged
 * primitive) so the lift survives even when the consumer doesn't reach
 * for the alias getter directly. Each lift's prop is consumed only by
 * the underlying rn-web primitive that expects it; rn-web silently
 * ignores unknown props on other primitives, so cross-application is
 * harmless.
 */
const allLifts: CssLiftMap = {
  ...imageLifts,
  ...switchLifts,
  ...textLifts,
  ...textInputLifts,
};

/**
 * `styled(TextInput)` (importing from 'react-native') needs to land on
 * the bridge shim so the web className reaches the DOM via styleq's
 * `$$css` escape hatch. The WeakMap maps each raw rn-web primitive to
 * the matching `bridgePrimitive`-wrapped variant; the alias-getter
 * seeding loop below fills every entry at module load.
 */
const rawToBridged = new WeakMap<object, React.ComponentType<BridgedProps>>();

function bridgeStyledCall<T>(target: T): unknown {
  let effectiveTarget = target;
  if (target !== null && (typeof target === 'function' || typeof target === 'object')) {
    const bridged = rawToBridged.get(target as object);
    if (bridged !== undefined) effectiveTarget = bridged as unknown as T;
  }
  const result = (styledWeb as unknown as (t: T) => Factoryish)(effectiveTarget);
  return wrapBridgeFactory(result, allLifts);
}
styled = bridgeStyledCall as unknown as typeof styledWeb & BridgedNamespace;
for (const key of Object.keys(styledWeb)) {
  const value = (styledWeb as unknown as Record<string, unknown>)[key];
  if (typeof value === 'function') {
    (styled as unknown as Record<string, unknown>)[key] = wrapBridgeFactory(
      value as Factoryish,
      allLifts
    );
  } else {
    (styled as unknown as Record<string, unknown>)[key] = value;
  }
}

type Factoryish = ((
  strings: TemplateStringsArray,
  ...args: unknown[]
) => React.ComponentType<unknown>) & {
  attrs: (a: unknown) => Factoryish;
  withConfig: (c: unknown) => Factoryish;
};

/**
 * Re-wraps `.attrs()` / `.withConfig()` so the lift extraction survives
 * the `.withConfig({componentId, displayName})` chain that
 * `babel-plugin-styled-components` synthesizes on every declaration.
 */
function wrapBridgeFactory(target: Factoryish, lifts?: CssLiftMap): Factoryish {
  if (lifts === undefined) return target;
  const wrapped = ((strings: TemplateStringsArray, ...args: unknown[]) => {
    const liftedAttrs = extractCssLifts(strings, lifts);
    const withLifts = Object.keys(liftedAttrs).length > 0 ? target.attrs(liftedAttrs) : target;
    return withLifts(strings, ...args);
  }) as Factoryish;
  wrapped.attrs = (a: unknown) => wrapBridgeFactory(target.attrs(a), lifts);
  wrapped.withConfig = (c: unknown) => wrapBridgeFactory(target.withConfig(c), lifts);
  return wrapped;
}

/**
 * Showcase + idiomatic consumer pattern is `padding: ${t.space.sm}px`
 * where `t.space.sm` is a `createTheme` sentinel `var(--sc-space-sm, 13)`.
 * After interpolation that becomes `padding: var(--sc-space-sm, 13)px`,
 * which the CSS parser drops because the `px` suffix lands outside the
 * var() boundary and the fallback isn't typed as a length.
 *
 * Rewrite the form `var(--<name>, <num>)<unit>` → `calc(var(--<name>, <num>) * 1<unit>)`
 * so the value parses as a valid <length-percentage> after substitution.
 * Only fires on var() refs with a bare-number fallback followed by a
 * known CSS unit identifier; pure color / string / unitless var()s pass
 * through untouched.
 *
 * Applied at the compiler's emit boundary so it sees the FULL CSS
 * source after all template interpolations are resolved (the var() and
 * the unit suffix live in different template segments at the
 * tagged-template level, so the rewrite can't run on the raw input).
 */
const VAR_WITH_UNIT_RE = /var\(\s*(--[a-zA-Z0-9_-]+)\s*,\s*([-+\d.]+)\s*\)([a-zA-Z%]+)/g;

/**
 * CSS Values 4 math functions return `<number>` when all arguments are
 * unitless. The showcase + idiomatic consumer pattern is `width:
 * abs(-180)` expecting a pixel value (mirrors RN's number-as-DIP
 * convention); the browser drops the declaration because `width`
 * needs `<length-percentage>`.
 *
 * Wrap bare-arg math function calls in `calc(<fn> * 1px)` so they
 * type as length. Only fires when the value consists entirely of a
 * single math function with unitless numeric arguments — any embedded
 * unit anywhere in the arg list signals the author already typed
 * the expression and we leave it alone.
 */
// Inner arg class anchored so the last char is non-whitespace, denying
// the trailing `\)\s*$` any backtracking room. Without this, a long
// run of inner whitespace can drag the engine into polynomial work on
// failed-tail inputs like `abs(<spaces>1<spaces>) X` (the trailing
// `X` defeats the anchored `$`, then the engine retries every split
// between the body and the closing `)`).
const BARE_MATH_FN_RE =
  /^\s*(abs|hypot|pow|mod|rem|sin|cos|tan|asin|acos|atan|atan2|exp|log|sqrt|sign)\(\s*([-+\d.,/*()](?:[-+\d.,\s/*()]*[-+\d.,/*()])?)\s*\)\s*$/i;
const KNOWN_UNITS = new Set([
  'px',
  'em',
  'rem',
  'lh',
  'rlh',
  'ch',
  'ex',
  'cap',
  'ic',
  '%',
  'vh',
  'vw',
  'vmin',
  'vmax',
  'svh',
  'svw',
  'lvh',
  'lvw',
  'dvh',
  'dvw',
  'cqh',
  'cqw',
  'cqmin',
  'cqmax',
  'cqi',
  'cqb',
  'fr',
  'deg',
  'rad',
  'grad',
  'turn',
  's',
  'ms',
]);
function rewriteVarUnitSuffix(input: string): string {
  if (input.indexOf('var(') < 0) return input;
  return input.replace(VAR_WITH_UNIT_RE, (match, name: string, fallback: string, unit: string) => {
    if (!KNOWN_UNITS.has(unit.toLowerCase())) return match;
    return 'calc(var(' + name + ', ' + fallback + ') * 1' + unit + ')';
  });
}

/**
 * Match a CSS declaration whose value is a bare-arg math function in
 * a length-context property. The capture lets the replacement keep
 * the prop name and only wrap the value.
 *
 * Length-context allowlist is conservative; properties that take
 * `<number>` (`opacity`, `z-index`, `flex-grow`, etc.) aren't
 * rewritten so `opacity: pow(0.5, 2)` remains valid.
 */
const LENGTH_CONTEXT_PROP_RE =
  '(?:width|height|min-width|max-width|min-height|max-height|top|left|right|bottom|inset(?:-[a-z]+)?|margin(?:-[a-z]+)?|padding(?:-[a-z]+)?|gap|row-gap|column-gap|border(?:-[a-z]+)?-width|outline-width|outline-offset|font-size|letter-spacing|word-spacing|text-indent|line-height|flex-basis|background-size)';
// Bare-math source without its anchors so we can splice it into a
// non-anchored composite regex. Group 1 = fn name; group 2 = args.
const BARE_MATH_BODY_RE = BARE_MATH_FN_RE.source.slice(1, -1);
const BARE_MATH_IN_LENGTH_PROP_RE = new RegExp(
  '(\\b' + LENGTH_CONTEXT_PROP_RE + '\\s*:\\s*)' + BARE_MATH_BODY_RE + '(?=\\s*[;}])',
  'gi'
);
function rewriteBareMathFn(input: string): string {
  if (input.indexOf('(') < 0) return input;
  return input.replace(
    BARE_MATH_IN_LENGTH_PROP_RE,
    (_match, head: string, fn: string, args: string) => {
      return head + 'calc(' + fn + '(' + args.trim() + ') * 1px)';
    }
  );
}

/**
 * `vertical-align: top|middle|bottom` is inert on rn-web's Text because
 * `Text` renders as a block-laying-out element and `vertical-align`
 * only applies to inline-level content in an inline formatting
 * context. The native engine on rn-web translated these keywords to
 * a flex container with `align-items: <flex-keyword>` so the Text
 * glyphs land at the requested edge of the parent box.
 *
 * Two scoped companion rules cover the two interpretations:
 * - non form-control elements get `display: flex; align-items: <flex>`
 *   so their child content lands at the requested edge (matches the
 *   native engine's TextBlock alignment behavior).
 * - `<textarea>` / `<input>` get `align-content: <flex>` so the input
 *   text itself lands at the requested edge inside the control. Block
 *   `align-content` is the standards-compliant way to vertically
 *   position text inside a textarea (CSS Box Alignment Module L3 §5).
 *
 * The original `vertical-align` declaration is kept so consumers
 * authoring CSS that runs in a non-rn-web context still see it.
 */
const VERT_ALIGN_RULE_RE =
  /(\.[a-zA-Z0-9_-]+)[^{}]*\{[^{}]*?vertical-align\s*:\s*(top|middle|bottom)[^{}]*\}/i;
const VERT_ALIGN_TO_FLEX: Record<string, string> = {
  top: 'flex-start',
  middle: 'center',
  bottom: 'flex-end',
};
/**
 * Returns companion rules for a class that uses `vertical-align: top
 * | middle | bottom`. Empty array if no match. CSSOM `insertRule`
 * accepts a single rule per call so companions are inserted as
 * separate entries by the caller.
 */
function verticalAlignCompanions(input: string): string[] {
  const m = VERT_ALIGN_RULE_RE.exec(input);
  if (!m) return [];
  const cls = m[1];
  const flexValue = VERT_ALIGN_TO_FLEX[m[2].toLowerCase()];
  if (!flexValue) return [];
  return [
    cls + ':not(textarea):not(input) { display: flex; align-items: ' + flexValue + '; }',
    cls + ':is(textarea, input) { align-content: ' + flexValue + '; }',
  ];
}

// Patch the shared `mainCompiler` so EVERY emitted CSS rule runs through
// the var()+unit rewrite. This catches both static-text declarations
// and the showcase-idiomatic `${t.space.x}<unit>` interpolation
// pattern (where the var() and the unit live in different segments of
// the tagged template). The mutation is contained to the bridge entry
// import; consumers who reach for the bridge subpath get the rewrite,
// pure web `styled-components` consumers that don't import the bridge
// see the unmodified compiler.
const __bridgeEmitOriginal = mainCompiler.emit;
const __bridgeCompileOriginal = mainCompiler.compile;
function applyBridgeRewrites(input: string): string {
  let out = input;
  out = rewriteVarUnitSuffix(out);
  out = rewriteBareMathFn(out);
  return out;
}
// `:not(...)` chains carry CSS-spec specificity each (`(0,n,0)` for n
// simple selectors), which beats a sibling `.cls[attr]` rule's (0,1,0)
// regardless of source order. Wrapping the chain in `:where(...)`
// zeroes the specificity and restores the native engine's source-order
// cascade. Anchored to the class selector at the start of the rule;
// nested chains elsewhere in the selector are left alone.
const NOT_CHAIN_AFTER_CLASS_RE = /(^\.[a-zA-Z0-9_-]+)((?::not\([^()]*\))+)/;

function applyBridgeRewritesToRules(rules: string[]): void {
  let extras: Array<{ index: number; rule: string }> | null = null;
  for (let i = 0; i < rules.length; i++) {
    let after = applyBridgeRewrites(rules[i]);
    if (after.indexOf(':not(') >= 0) {
      after = after.replace(NOT_CHAIN_AFTER_CLASS_RE, '$1:where($2)');
    }
    if (after !== rules[i]) rules[i] = after;
    if (after.indexOf('vertical-align') < 0) continue;
    const companions = verticalAlignCompanions(after);
    if (companions.length === 0) continue;
    if (extras === null) extras = [];
    for (let j = 0; j < companions.length; j++) {
      // Same `index` for every companion of the source rule; the reverse
      // splice below lands them in pushed order right after the source.
      extras.push({ index: i + 1, rule: companions[j] });
    }
  }
  if (extras === null) return;
  for (let i = extras.length - 1; i >= 0; i--) {
    const { index, rule } = extras[i];
    rules.splice(index, 0, rule);
  }
}
mainCompiler.emit = function patchedEmit(
  source: Parameters<typeof __bridgeEmitOriginal>[0],
  filled: Parameters<typeof __bridgeEmitOriginal>[1],
  parentSelector: Parameters<typeof __bridgeEmitOriginal>[2],
  componentId: Parameters<typeof __bridgeEmitOriginal>[3],
  fragments: Parameters<typeof __bridgeEmitOriginal>[4]
): string[] {
  const rules = __bridgeEmitOriginal.call(
    mainCompiler,
    source,
    filled,
    parentSelector,
    componentId,
    fragments
  );
  applyBridgeRewritesToRules(rules);
  return rules;
};
mainCompiler.compile = function patchedCompile(
  css: string,
  selector?: string,
  prefix?: string,
  componentId?: string
): string[] {
  const rules = __bridgeCompileOriginal.call(mainCompiler, css, selector, prefix, componentId);
  applyBridgeRewritesToRules(rules);
  return rules;
};

/**
 * Walk the static string segments of a tagged template and extract
 * any CSS declarations matching the lift map. Dynamic segments
 * (interpolated args) are skipped because we can't statically evaluate
 * them. Returns the lifted prop bag ready to feed `.attrs()`.
 */
function extractCssLifts(
  strings: TemplateStringsArray,
  lifts: CssLiftMap
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const cssProp in lifts) {
    const { prop, transform } = lifts[cssProp];
    const re = liftRegex(cssProp);
    for (const segment of strings) {
      const m = segment.match(re);
      if (m === null) continue;
      const value = m[1]
        .trim()
        .replace(/!important$/i, '')
        .trim();
      const lifted = transform ? transform(value) : value;
      // A transform returning `undefined` means "no lift for this value"
      // (e.g. `text-wrap: balance` doesn't map to `numberOfLines`).
      if (lifted !== undefined) out[prop] = lifted;
      break;
    }
  }
  return out;
}

const bridgedCache = new Map<KnownAlias, unknown>();
// Eagerly seed `rawToBridged` for every alias so a consumer's
// `styled(rawPrimitive)` (with the import from 'react-native')
// always resolves to the bridged shim — even if they never reach
// for `styled.X` first. Lazy seeding caused a bug where mixing the
// two forms across widgets depended on render order.
aliases.forEach(alias => {
  const primitive = reactNativeWeb[alias];
  if (primitive) {
    rawToBridged.set(
      primitive as object,
      bridgePrimitive(primitive as React.ComponentType<BridgedProps>, 'Bridged' + alias)
    );
  }
});

aliases.forEach(alias => {
  Object.defineProperty(styled, alias, {
    enumerable: true,
    configurable: false,
    get(): unknown {
      const cached = bridgedCache.get(alias);
      if (cached) return cached;
      const primitive = reactNativeWeb[alias];
      if (!primitive) {
        throw new Error(
          `${alias} is not available in the currently-installed version of react-native-web`
        );
      }
      // `rawToBridged` was seeded for every alias at module load so
      // `styled(rawPrimitive)` resolves to the same bridged shim
      // even when the consumer never touches the alias getter first.
      const bridged = rawToBridged.get(primitive as object)!;
      const baseline = baselineCss[alias];
      const base = baseline
        ? styledWeb(bridged)`
            ${baseline}
          `
        : bridged;
      const styledBridged = styledWeb(base as React.ComponentType);
      const lifts = liftsByAlias[alias];
      const exposed = wrapBridgeFactory(styledBridged as Factoryish, lifts);
      bridgedCache.set(alias, exposed);
      return exposed;
    },
  });
});

/**
 * Walk an override theme object and emit `{ '--<prefix><path>': value }`
 * entries for every leaf. `walkTheme` from `createTheme.shared` builds a
 * nested mirror; this flattens to keys suitable for an inline `style`.
 */
function flattenThemeToVars(theme: unknown, out: Record<string, string>, path?: string): void {
  if (theme == null || typeof theme !== 'object') return;
  for (const key in theme as Record<string, unknown>) {
    const val = (theme as Record<string, unknown>)[key];
    const fullPath = path ? path + '-' + key : key;
    if (val != null && typeof val === 'object') {
      flattenThemeToVars(val, out, fullPath);
    } else if (val !== undefined && typeof val !== 'function') {
      out['--sc-' + fullPath] = String(val);
    }
  }
}

/**
 * Bridge ThemeProvider: provides the JS theme context like the upstream
 * `ThemeProvider`, and additionally publishes the override as CSS custom
 * properties on a `display: contents` wrapper. createTheme's sentinels
 * (`var(--sc-<path>, fallback)`) then resolve from the closest ancestor,
 * giving native-style scoped overrides on rn-web without consumers
 * mounting `theme.GlobalStyle` per subtree.
 *
 * Function-form themes skip the var publish (would need to call the fn
 * with the outer context); the JS-context path still flows through the
 * underlying provider, so function-interpolation reads keep working.
 */
function BridgeThemeProvider(props: {
  theme: unknown;
  children?: React.ReactNode;
}): React.JSX.Element | null {
  const wrapperStyle = React.useMemo(() => {
    if (typeof props.theme !== 'object' || props.theme === null) return null;
    const cssVars: Record<string, string> = {};
    flattenThemeToVars(props.theme, cssVars);
    if (Object.keys(cssVars).length === 0) return null;
    return { display: 'contents' as const, ...cssVars };
  }, [props.theme]);
  if (props.children == null) return null;
  const inner = React.createElement(
    RawThemeProvider as React.ComponentType<{ theme: unknown; children?: React.ReactNode }>,
    { theme: props.theme },
    props.children
  );
  if (wrapperStyle === null) return inner;
  return React.createElement('div', { style: wrapperStyle }, inner);
}

/**
 * `toStyleSheet` mirrors the native entry's helper for evaluating a `css`
 * tagged template into a flat RN-style object. On the bridge there is
 * no RN StyleSheet to map onto; consumers wanting the equivalent
 * web-side primitive should use `css` directly. We export a stub so
 * the named symbol exists, matching the native module surface for
 * drop-in replacement.
 */
function toStyleSheet(): Record<string, unknown> {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(
      '`toStyleSheet` is a no-op on the rn-web bridge; the web pipeline emits CSS through CSSOM rather than RN style objects.'
    );
  }
  return {};
}

export default styled;
export {
  styled,
  createTheme,
  css,
  keyframes,
  createGlobalStyle,
  withTheme,
  isStyledComponent,
  BridgeThemeProvider as ThemeProvider,
  ThemeConsumer,
  ThemeContext,
  toStyleSheet,
  useTheme,
  StyleSheetManager,
  ServerStyleSheet,
};

// Mirror the responsive + native-context surface so consumers calling
// these from `styled-components/native` on rn-web keep getting the
// same module-level identifiers. `useContainer` family returns null /
// false on the bridge because container queries are handled natively
// by the browser via `@container` CSS — there's no need for a JS
// hook to mirror them.
export {
  matchMedia,
  useBreakpoint,
  useContainer,
  useContainerQuery,
  useMediaEnv,
  useMediaQuery,
} from '../responsive';
export type { ContainerEntry, MediaQueryEnv } from '../responsive';
export { NativeStyleContext, useNativeStyleContext } from '../NativeStyleContext';
export type {
  ContainerContextValue,
  NativeCascadeValues,
  NativeStyleContextValue,
} from '../NativeStyleContext';
export { ParentContext, useParentContext } from '../ParentContext';
export type { ParentContextValue } from '../ParentContext';

export type {
  CompiledAst,
  CSSKeyframes,
  CSSObject,
  CSSProperties,
  CSSPseudos,
  DefaultTheme,
  ExecutionContext,
  ExecutionProps,
  IStyledComponent,
  IStyledComponentFactory,
  IStyledStatics,
  NativeTarget,
  PolymorphicComponent,
  PolymorphicComponentProps,
  RuleSet,
  Runtime,
  StyledObject,
  StyledOptions,
} from '../../types';
