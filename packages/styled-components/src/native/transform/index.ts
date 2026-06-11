import { Dict } from '../../types';
import * as $ from '../../utils/charCodes';
import { warnIfAndroidSkew, warnIfIosGatedFilter, warnIfIosVerticalAlign, warnOnce } from './dev';
import {
  collapseIdenticalCommas,
  getPassthroughKeys,
  isLayeredCommaProp,
  isMultiTokenPosition,
  isValidLayeredBackgroundValue,
  normalizeBackgroundPositionValue,
  substituteBackgroundSizeKeywordsForNative,
} from './passthrough';
import { hasRelativeFromPrefix, staticColorFunctionToHex } from './polyfills/colorMath';
import { numericResultToRn, resolveStaticMathFunction } from './polyfills/mathFns';
import { buildResolver } from './polyfills/resolvers';
import { getSystemColorPlatformColor } from './polyfills/systemColors';
import { getShorthand } from './shorthands';
import { tokenize } from './tokenize';
import { Token, TokenKind } from './tokens';
import { warnIfConicGradientNative } from './handlers/background';
import { maybeExpandBackgroundImageSystemColors } from './backgroundGradientNative';
import { maybeExpandBoxShadowSystemColors } from './boxShadowSystemColors';
import { maybeExpandFilterDropShadowSystemColors } from './filterSystemColors';
import { coerceRawValue } from './units';

/**
 * Camelize a CSS property name. Custom properties (`--var-name`) pass
 * through unchanged. Vendor prefixes (`-webkit-*`, `-ms-*`) are stripped
 * entirely; they never apply to RN, and the remaining name is
 * camelized.
 *
 * Hot-path; cached per-process. Uses a prototypeless object instead of
 * Map; for short string keys with high hit rate (prop names recur across
 * every styled component), V8 inline-caches dictionary access faster than
 * Map.get's getter-call. The `null` sentinel distinguishes "no entry" from
 * "value is undefined" (which can't happen here, but being explicit costs
 * nothing).
 */
const camelCache: Record<string, string> = Object.create(null);
export function camelize(prop: string): string {
  const hit = camelCache[prop];
  if (hit !== undefined) return hit;
  // Custom properties are returned as-is (the parser may pass `--foo`)
  if (prop.length > 1 && prop.charCodeAt(0) === $.HYPHEN && prop.charCodeAt(1) === $.HYPHEN) {
    camelCache[prop] = prop;
    return prop;
  }
  let out = '';
  let toUpper = false;
  let i = 0;
  // Strip vendor prefix
  if (prop.charCodeAt(0) === $.HYPHEN) {
    const end = prop.indexOf('-', 1);
    if (end !== -1) i = end + 1;
  }
  for (; i < prop.length; i++) {
    const c = prop.charCodeAt(i);
    if (c === $.HYPHEN) {
      toUpper = true;
      continue;
    }
    out += toUpper ? prop[i].toUpperCase() : prop[i];
    toUpper = false;
  }
  camelCache[prop] = out;
  return out;
}

// Side-effect import; populates the shorthand registry. Kept separate
// so the registry module and the shorthand modules can tree-shake
// independently (polyfills reuse getShorthand without dragging in the
// full shorthand set).
import './shorthands.register';

// Per-property single-passthrough handlers. Properties listed here have
// either a target-specific lift, a value rewrite, or a dual-emit shape
// that diverges from the generic identity passthrough. Properties not
// listed fall through to `{ [passthroughKeys[0]]: value }`.
type SinglePassthroughHandler = (value: string, rawValue: string) => Dict<any>;
const SINGLE_PASSTHROUGH_HANDLERS: Record<string, SinglePassthroughHandler> = {
  verticalAlign: value => {
    // rn-web Text defaults to `display: inline`, where height is a no-op
    // and vertical-align is inert inside flex parents; the align-content
    // companion realizes the alignment there (flex-prefixed keywords only;
    // rn-web's Flow types reject the bare `start` / `end` forms).
    if (__NATIVE_WEB__) {
      const alignContent =
        value === 'top'
          ? 'flex-start'
          : value === 'middle'
            ? 'center'
            : value === 'bottom'
              ? 'flex-end'
              : null;
      if (alignContent !== null) return { alignContent, verticalAlign: value };
    }
    return { verticalAlign: value };
  },
  boxShadow: value => ({ boxShadow: maybeExpandBoxShadowSystemColors(value) }),
  filter: value => ({ filter: maybeExpandFilterDropShadowSystemColors(value) }),
  // Android has no isolation style key; the platform primitive that forces
  // an isolated compositing surface (so blended descendants composite
  // against the group, not the page) is the hardware-texture layer. iOS
  // drops the Android-suffixed prop and consumes the style key instead.
  isolation: value =>
    !__NATIVE_WEB__ && value === 'isolate'
      ? { isolation: value, renderToHardwareTextureAndroid: true }
      : { isolation: value },
  // Dual-emit so RN Text honors the cascade. rn-web rejects `direction` as
  // a style key; the `dir` prop lift feeds its LocaleContext instead so
  // descendants and BiDi-aware text-align resolve against the new value.
  direction: value =>
    __NATIVE_WEB__
      ? { dir: value, writingDirection: value }
      : { direction: value, writingDirection: value },
  objectFit: value => ({ objectFit: value }),
};

/**
 * Transform a single CSS declaration into an RN style partial.
 *
 * Dispatch order:
 * 1. Camelize the prop name (kebab → camelCase); custom `--props`
 *    pass through unchanged, vendor prefixes get stripped.
 * 2. If the property is a known pass-through → `{ [prop]: rawValue }`.
 * 3. If a shorthand handler is registered → tokenize + expand.
 * 4. Polyfill layer: try static math-fn resolution (`calc/min/max/clamp`)
 *    for single-token values over static arms. Resolves to a number or
 *    a `'N%'` string.
 * 5. Otherwise → coerce the value (`10px` → `10`, keep percent strings,
 *    etc.) and emit `{ [prop]: coerced }`.
 */
export function transformDecl(prop: string, rawValue: string): Dict<any> {
  const camel = camelize(prop);

  // System color keywords. Route through PlatformColor so iOS / Android
  // use semantic colors. `accentColor` skips here so its handler can
  // lift `trackColor.true` from the original keyword.
  if (
    (camel === 'color' || camel.endsWith('Color')) &&
    camel !== 'accentColor' &&
    rawValue.length > 0 &&
    rawValue.indexOf(' ') === -1 &&
    rawValue.indexOf('(') === -1 &&
    rawValue.indexOf(',') === -1 &&
    rawValue.charCodeAt(0) !== $.HASH
  ) {
    const platformColor = getSystemColorPlatformColor(rawValue);
    if (platformColor !== null) return { [camel]: platformColor };
  }

  // `z-index: auto`: RN's zIndex prop is a plain number (Android Fabric
  // throws casting a string), and an absent zIndex is exactly the `auto`
  // behavior, so the declaration drops on native. The browser implements
  // `auto` natively.
  if (camel === 'zIndex' && rawValue.trim() === 'auto') {
    if (__NATIVE_WEB__) return { zIndex: 'auto' };
    return {};
  }

  // `order`: browsers reorder flex/grid items visually without touching
  // source order. React Native's Yoga has no equivalent; children render
  // in JSX order regardless. On rn-web the browser handles it; on native
  // we drop it and tell the developer how to reorder for real.
  if (camel === 'order') {
    if (__NATIVE_WEB__) {
      return { order: coerceRawValue('order', rawValue) };
    }
    if (__DEV__) {
      warnOnce(
        'native-order-unsupported',
        '`order: ' +
          rawValue +
          '` has no effect on React Native; iOS and Android render children in JSX order. Reorder the JSX children directly, or use `flex-direction: row-reverse` / `column-reverse` to flip a whole axis.',
        rawValue
      );
    }
    return {};
  }

  // `display: grid`: React Native has no grid formatting context. The
  // closest primitive is a wrapping flex row, which the grid item math
  // (read from the published cascade at render) then sizes exactly. The
  // `__scGridContainer` sentinel signals `compileNative` to lift the
  // grid metadata. On rn-web the browser lays out a real grid, so the
  // declaration passes through. Other `display` values fall through to
  // the generic passthrough below.
  if (camel === 'display' && rawValue.trim() === 'grid') {
    if (__NATIVE_WEB__) return { display: 'grid' };
    return { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', __scGridContainer: true };
  }

  // CSS-wide keywords (initial / inherit / unset / revert / revert-layer):
  // React Native has no cascade to resolve them against, and its style
  // defaults differ from CSS initial values, so a silent drop or a literal
  // string reaching RN would both misrender. Drop loudly on native; the
  // browser implements explicit defaulting, so rn-web passes through.
  const wideKeyword = asCssWideKeyword(rawValue);
  if (
    wideKeyword !== null &&
    // Exempt pairs the platform (or a spec'd shorthand expansion)
    // implements natively: RN's `direction` enum includes `inherit` (the
    // Yoga default), and Flexbox defines `flex: initial` as the static
    // `0 1 auto`.
    !(camel === 'direction' && wideKeyword === 'inherit') &&
    !(camel === 'flex' && wideKeyword === 'initial')
  ) {
    if (__NATIVE_WEB__) return { [camel]: wideKeyword };
    if (__DEV__) {
      warnOnce(
        'native-css-wide-keyword',
        '`' +
          prop +
          ': ' +
          wideKeyword +
          '` is a CSS-wide keyword; React Native has no cascade to resolve it against, and its style defaults can differ from the CSS initial values, so the declaration was ignored. Set an explicit value instead.',
        camel + ':' + wideKeyword
      );
    }
    return {};
  }

  // Whole-value `light-dark()` on rn-web: the color normalizer strips the
  // function (its allowlist is @react-native/normalize-colors), but
  // custom-property keys and `var()` references reach the DOM untouched, so
  // the browser resolves both branches natively. The custom key is
  // pre-hyphenated because rn-web runs hyphenateStyleName over every style
  // key and would mangle a camelCase custom property. `color-scheme: light
  // dark` is the opt-in the UA needs to honor the dark branch. Values
  // carrying theme sentinels stay on the render-time resolver path instead;
  // an inline custom property never passes through sentinel substitution.
  if (__NATIVE_WEB__ && rawValue.indexOf('\0') === -1 && isWholeLightDark(rawValue)) {
    const kebab = hyphenate(camel);
    return {
      ['--sc-ld-' + kebab]: rawValue,
      [camel]: 'var(--sc-ld-' + kebab + ')',
      colorScheme: 'light dark',
    };
  }

  const passthroughKeys = getPassthroughKeys(camel);
  if (passthroughKeys !== undefined) {
    if (__DEV__) {
      if (passthroughKeys[0] === 'transform') {
        warnIfAndroidSkew(rawValue);
      } else if (camel === 'verticalAlign') {
        warnIfIosVerticalAlign(rawValue);
      } else if (camel === 'filter') {
        warnIfIosGatedFilter(rawValue);
      }
    }
    if (!isValidLayeredBackgroundValue(camel, rawValue)) {
      if (__DEV__) {
        warnOnce(
          'native-shorthand-parse',
          `the value "${rawValue}" could not be parsed for property "${prop}". The declaration was ignored.`,
          camel + ':' + rawValue
        );
      }
      return {};
    }
    let value = isLayeredCommaProp(camel) ? collapseIdenticalCommas(rawValue) : rawValue;
    if (camel === 'backgroundPosition') value = normalizeBackgroundPositionValue(value);
    if (passthroughKeys.length === 1) {
      const handler = SINGLE_PASSTHROUGH_HANDLERS[camel];
      if (handler !== undefined) return handler(value, rawValue);
      return { [passthroughKeys[0]]: value };
    }
    // Dual-emit (background props): write every key in order so the
    // host platform sees both the vendor-prefixed and standard names.
    // `experimental_backgroundSize` folds `cover` / `contain` to `auto`
    // because RN 0.85's native parser drops the keyword strings and
    // lands an empty list that later crashes the draw pass; see
    // `substituteBackgroundSizeKeywordsForNative` for the spec basis.
    // Pre-fold gradient stops carrying system colors so RN's array form
    // ships a PlatformColor object.
    if (
      __DEV__ &&
      !__NATIVE_WEB__ &&
      camel === 'backgroundImage' &&
      value.indexOf('conic-gradient(') !== -1
    ) {
      warnIfConicGradientNative(value);
    }
    const nativeImage =
      camel === 'backgroundImage' ? maybeExpandBackgroundImageSystemColors(value) : value;
    // rn-web's validator rejects `backgroundPosition` with more than one
    // top-level value; emit only the experimental_* key so the native
    // side still receives the full grammar. See `isMultiTokenPosition`.
    const skipRnWebPosition = camel === 'backgroundPosition' && isMultiTokenPosition(value);
    const out: Dict<any> = {};
    for (let i = 0; i < passthroughKeys.length; i++) {
      const key = passthroughKeys[i];
      if (skipRnWebPosition && key === 'backgroundPosition') continue;
      if (key === 'experimental_backgroundImage') {
        out[key] = nativeImage;
        continue;
      }
      out[key] =
        key === 'experimental_backgroundSize'
          ? substituteBackgroundSizeKeywordsForNative(value)
          : value;
    }
    return out;
  }

  // Single-token sentinel values (e.g. `color: ${t.colors.fg}` produces
  // exactly one `\0sc:…` atom) bypass shorthand expansion; they're atomic
  // placeholders that the render-time resolver replaces with the concrete
  // theme value. Multi-token values containing a sentinel as one component
  // (e.g. `border: ${t.borderWidth.hairline}px solid ${t.colors.ink}`)
  // must NOT bypass;they need shorthand expansion so each part lands on
  // the right RN prop.
  if (rawValue.length > 0 && rawValue.charCodeAt(0) === 0 && isSingleSentinel(rawValue)) {
    return { [camel]: rawValue };
  }

  // Tokens are needed for shorthand expansion AND for the static math /
  // color polyfill checks below. Tokenize once; reuse across paths.
  let tokens: Token[] | null = null;

  const shorthand = getShorthand(camel);
  if (shorthand !== undefined) {
    tokens = tokenize(rawValue);
    const out = shorthand(tokens, rawValue);
    if (out !== null) return out;
    if (__DEV__) {
      warnOnce(
        'native-shorthand-parse',
        `the value "${rawValue}" could not be parsed for property "${camel}". The declaration was ignored.`,
        camel + ':' + rawValue
      );
    }
    return {};
  }

  // Static math fns: fold on native. On rn-web, expressions whose result
  // carries a unit pass through raw (the browser computes them against the
  // real containing block); unitless results still fold because a bare
  // function like `width: pow(8, 2)` is not renderable CSS, while the
  // folded number follows the RN dp convention on every host.
  if (mightBeMathFn(rawValue)) {
    tokens = tokens ?? tokenize(rawValue);
    if (tokens.length === 1 && tokens[0].kind === TokenKind.Function) {
      const numeric = resolveStaticMathFunction(tokens[0]);
      if (numeric !== null) {
        if (__NATIVE_WEB__ && numeric.unit !== '') return { [camel]: rawValue };
        return { [camel]: numericResultToRn(numeric) };
      }
    }
  }

  // Polyfill: static color fn (`oklch` / `oklab` / `lch` / `lab` /
  // `color-mix` / `color`) → hex. Same prefix-then-tokenize pattern. The
  // fold runs on every host: rn-web's `normalizeColor` only recognizes
  // hex / rgb / hsl / hwb (`@react-native/normalize-colors`), so the
  // modern function forms get stripped to `undefined` (transparent)
  // before the browser sees them. Folding to hex up front guarantees a
  // renderable value on iOS, Android, and rn-web; out-of-gamut values
  // clip per channel.
  if (mightBeModernColor(rawValue)) {
    tokens = tokens ?? tokenize(rawValue);
    if (tokens.length === 1 && tokens[0].kind === TokenKind.Function) {
      const hex = staticColorFunctionToHex(tokens[0]);
      if (hex !== null) return { [camel]: hex };
    }
    // Static fold bailed, but the value may still resolve at render
    // time: theme-token sentinels, tree-counting functions
    // (`sibling-index()`), and env-dependent channel math all get a
    // resolver from `buildResolver` and fold to hex per render. Warn
    // only when nothing downstream can render the value (unknown
    // colorspace, an interpolation space RN can't reach), so it doesn't
    // silently paint transparent. The dedupeSuffix is the value itself
    // so repeat declarations don't spam.
    if (__DEV__ && rawValue.indexOf('\0') === -1 && buildResolver(rawValue, camel) === null) {
      warnOnce(
        'native-modern-color-cant-fold',
        `the value "${rawValue}" for "${camel}" uses a modern color form React Native cannot render directly. ` +
          `Use a literal \`#hex\`, \`rgb()\`, or \`hsl()\` value, or make sure any color math can be resolved before render.`,
        camel + ':' + rawValue
      );
    }
  }

  // Hot path for the common case (single color / numeric / ident).
  return { [camel]: coerceRawValue(camel, rawValue) };
}

/**
 * True when the value is exactly one createTheme sentinel atom (no
 * additional tokens). Sentinels terminate at whitespace, comma, or slash
 * (per `findSentinelEnd` in the tokenizer); so a single-token sentinel
 * has none of those characters.
 */
function isSingleSentinel(v: string): boolean {
  for (let i = 1; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d || c === 0x2c || c === 0x2f) {
      return false;
    }
  }
  return true;
}

/**
 * True when any character in the leading function-name prefix is
 * uppercase ASCII. Used as a fast gate before allocating a lowercased
 * copy: most CSS in the wild is already lowercase, so the common path
 * skips the allocation entirely.
 *
 * `endExclusive` clamps the scan to the prefix actually needed (e.g. 9
 * for `color-mix(`); we never read past the candidate function name.
 */
function hasUpperInPrefix(v: string, endExclusive: number): boolean {
  const limit = v.length < endExclusive ? v.length : endExclusive;
  for (let i = 0; i < limit; i++) {
    const c = v.charCodeAt(i);
    if (c >= 0x41 && c <= 0x5a) return true;
  }
  return false;
}

/** Kebab-case a camelCase property name (`backgroundColor` → `background-color`). */
function hyphenate(camel: string): string {
  let out = '';
  for (let i = 0; i < camel.length; i++) {
    const c = camel.charCodeAt(i);
    out += c >= 0x41 && c <= 0x5a ? '-' + camel[i].toLowerCase() : camel[i];
  }
  return out;
}

/** True when the value is exactly one `light-dark(...)` function. */
function isWholeLightDark(v: string): boolean {
  if (v.length < 12) return false;
  const haystack = hasUpperInPrefix(v, 11) ? v.toLowerCase() : v;
  if (!haystack.startsWith('light-dark(')) return false;
  const tokens = tokenize(v);
  return tokens.length === 1 && tokens[0].kind === TokenKind.Function;
}

function mightBeMathFn(v: string): boolean {
  // Cheap prefix check before tokenizing; avoids work on `10px` etc. Function
  // names are ASCII case-insensitive, so scan a 6-char prefix for any uppercase
  // letter and lowercase only when one is found (longest fn name is `atan2(`).
  if (v.length <= 4) return false;
  const haystack = hasUpperInPrefix(v, 6) ? v.toLowerCase() : v;
  const c0 = haystack.charCodeAt(0);
  if (c0 === 0x63 /* c */)
    return (
      haystack.startsWith('calc(') || haystack.startsWith('clamp(') || haystack.startsWith('cos(')
    );
  if (c0 === 0x6d /* m */)
    return (
      haystack.startsWith('min(') || haystack.startsWith('max(') || haystack.startsWith('mod(')
    );
  if (c0 === 0x72 /* r */) return haystack.startsWith('round(') || haystack.startsWith('rem(');
  if (c0 === 0x73 /* s */)
    return (
      haystack.startsWith('sin(') || haystack.startsWith('sqrt(') || haystack.startsWith('sign(')
    );
  if (c0 === 0x74 /* t */) return haystack.startsWith('tan(');
  if (c0 === 0x61 /* a */)
    return (
      haystack.startsWith('abs(') ||
      haystack.startsWith('asin(') ||
      haystack.startsWith('acos(') ||
      haystack.startsWith('atan(') ||
      haystack.startsWith('atan2(')
    );
  if (c0 === 0x70 /* p */) return haystack.startsWith('pow(');
  if (c0 === 0x68 /* h */) return haystack.startsWith('hypot(');
  if (c0 === 0x6c /* l */) return haystack.startsWith('log(');
  if (c0 === 0x65 /* e */) return haystack.startsWith('exp(');
  return false;
}

/**
 * Whole-value, ASCII case-insensitive match against the CSS-wide keywords
 * (initial / inherit / unset / revert / revert-layer). Returns the
 * normalized keyword, or null for any other value. First-char gate keeps
 * the hot path to one charCode read for the overwhelming majority of
 * values.
 */
function asCssWideKeyword(v: string): string | null {
  const c0 = v.charCodeAt(0) | 0x20;
  if (c0 !== 0x69 /* i */ && c0 !== 0x75 /* u */ && c0 !== 0x72 /* r */) return null;
  const t = v.trim().toLowerCase();
  if (t === 'initial' || t === 'inherit' || t === 'unset' || t === 'revert' || t === 'revert-layer')
    return t;
  return null;
}

function mightBeModernColor(v: string): boolean {
  // Cheap prefix check; modern function forms RN doesn't understand:
  // `oklch(`, `oklab(`, `lch(`, `lab(`, `color-mix(`, `color(`.
  // RN already handles the ABSOLUTE hex / rgb / hsl / hwb forms at
  // runtime, so those bypass the fold. The relative-color from-forms of
  // rgb / hsl / hwb (`rgb(from red r g b)`) are NOT understood by RN's
  // normalizeColor, so they must fold; gate them on a `from` prefix.
  // Longest prefix is `color-mix(` (10).
  if (v.length < 5) return false;
  const haystack = hasUpperInPrefix(v, 10) ? v.toLowerCase() : v;
  const c0 = haystack.charCodeAt(0);
  if (c0 === 0x6f /* o */) return haystack.startsWith('oklch(') || haystack.startsWith('oklab(');
  if (c0 === 0x6c /* l */) return haystack.startsWith('lch(') || haystack.startsWith('lab(');
  if (c0 === 0x63 /* c */)
    return haystack.startsWith('color-mix(') || haystack.startsWith('color(');
  if (c0 === 0x72 /* r */) {
    if (haystack.startsWith('rgb(')) return hasRelativeFromPrefix(v, 3);
    if (haystack.startsWith('rgba(')) return hasRelativeFromPrefix(v, 4);
    return false;
  }
  if (c0 === 0x68 /* h */) {
    if (haystack.startsWith('hsl(') || haystack.startsWith('hwb('))
      return hasRelativeFromPrefix(v, 3);
    if (haystack.startsWith('hsla(')) return hasRelativeFromPrefix(v, 4);
    return false;
  }
  return false;
}
