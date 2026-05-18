import { Dict } from '../../types';
import * as $ from '../../utils/charCodes';
import hyphenateStyleName from '../../utils/hyphenateStyleName';
import { warnIfAndroidSkew, warnIfIosVerticalAlign, warnOnce } from './dev';
import {
  collapseIdenticalCommas,
  getPassthroughKeys,
  isLayeredCommaProp,
  isMultiTokenPosition,
  isValidLayeredBackgroundValue,
  normalizeBackgroundPositionValue,
  substituteBackgroundSizeKeywordsForNative,
} from './passthrough';
import { staticColorFunctionToHex } from './polyfills/colorMath';
import { numericResultToRn, resolveStaticMathFunction } from './polyfills/mathFns';
import {
  getSystemColorPlatformColor,
  isCssSystemColorKeyword,
  wrapSystemColorForRnWeb,
} from './polyfills/systemColors';
import { getShorthand } from './shorthands';
import { tokenize } from './tokenize';
import { Token, TokenKind } from './tokens';
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

const VERTICAL_ALIGN_TO_ALIGN_CONTENT: Record<
  string,
  'flex-start' | 'center' | 'flex-end' | undefined
> = {
  top: 'flex-start',
  middle: 'center',
  bottom: 'flex-end',
};

// rn-web's Image ignores `objectFit` and reads `resizeMode`; this table
// mirrors RN core's internal native conversion so both bars agree.
const OBJECT_FIT_TO_RN_RESIZE_MODE: Record<string, string | undefined> = {
  contain: 'contain',
  cover: 'cover',
  fill: 'stretch',
  none: 'none',
  'scale-down': 'contain',
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

  // System color keywords. Native: PlatformColor so iOS / Android route
  // through semantic colors. rn-web: wrap in `var(--unset, kw)` so the
  // value survives rn-web's color allowlist and the browser resolves
  // against OS theme. `accentColor` skips here so its handler can lift
  // `trackColor.true` from the original keyword.
  if (
    (camel === 'color' || camel.endsWith('Color')) &&
    camel !== 'accentColor' &&
    rawValue.length > 0 &&
    rawValue.indexOf(' ') === -1 &&
    rawValue.indexOf('(') === -1 &&
    rawValue.indexOf(',') === -1 &&
    rawValue.charCodeAt(0) !== $.HASH
  ) {
    if (__NATIVE_WEB__) {
      if (isCssSystemColorKeyword(rawValue)) {
        return { [camel]: wrapSystemColorForRnWeb(rawValue) };
      }
    } else {
      const platformColor = getSystemColorPlatformColor(rawValue);
      if (platformColor !== null) return { [camel]: platformColor };
    }
  }

  const passthroughKeys = getPassthroughKeys(camel);
  if (passthroughKeys !== undefined) {
    if (__DEV__) {
      if (passthroughKeys[0] === 'transform') {
        warnIfAndroidSkew(rawValue);
      } else if (camel === 'verticalAlign') {
        warnIfIosVerticalAlign(rawValue);
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
      // rn-web's `vertical-align` is baseline-only; emit `align-content`
      // for the box-positioning keywords so they reposition content
      // like Android's `textAlignVertical`. Other values fall through
      // to the browser's native baseline-shifting semantics.
      if (__NATIVE_WEB__ && camel === 'verticalAlign') {
        const alignContent = VERTICAL_ALIGN_TO_ALIGN_CONTENT[rawValue];
        if (alignContent !== undefined) {
          return { verticalAlign: value, alignContent };
        }
      }
      if (camel === 'boxShadow') {
        return { boxShadow: maybeExpandBoxShadowSystemColors(value) };
      }
      if (camel === 'filter') {
        return { filter: maybeExpandFilterDropShadowSystemColors(value) };
      }
      // Native: dual-emit so RN Text honors the cascade. rn-web also
      // lifts a `dir` prop since rn-web's BiDi-aware text-align reads
      // `props.dir`, not the CSS direction.
      if (camel === 'direction') {
        if (__NATIVE_WEB__) return { writingDirection: value, dir: value };
        return { direction: value, writingDirection: value };
      }
      // rn-web's Image reads `resizeMode`, not `objectFit`; lift via
      // SPECIAL_CASE_PROPS using the spec conversion table.
      if (camel === 'objectFit') {
        if (__NATIVE_WEB__) {
          const mapped = OBJECT_FIT_TO_RN_RESIZE_MODE[value];
          return mapped !== undefined ? { resizeMode: mapped } : {};
        }
        return { objectFit: value };
      }
      return { [passthroughKeys[0]]: value };
    }
    // Dual-emit (background props): write every key in order so the
    // host platform sees both the vendor-prefixed and standard names.
    // `experimental_backgroundSize` folds `cover` / `contain` to `auto`
    // because RN 0.85's native parser drops the keyword strings and
    // lands an empty list that later crashes the draw pass; see
    // `substituteBackgroundSizeKeywordsForNative` for the spec basis.
    // `backgroundPosition` skips the rn-web key when the value is
    // multi-token (rn-web's validator drops it anyway with a
    // console.error); see `isMultiTokenPosition`.
    // Pre-fold gradient stops carrying system colors so RN's array form
    // ships a PlatformColor object. rn-web keeps the raw string.
    const nativeImage =
      camel === 'backgroundImage' && !__NATIVE_WEB__
        ? maybeExpandBackgroundImageSystemColors(value)
        : value;
    const out: Dict<any> = {};
    const dropRnWebPosition = camel === 'backgroundPosition' && isMultiTokenPosition(value);
    for (let i = 0; i < passthroughKeys.length; i++) {
      const key = passthroughKeys[i];
      if (dropRnWebPosition && key === 'backgroundPosition') continue;
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

  // rn-web bundle path. Pure-static `light-dark(...)` values get wrapped
  // in a CSS custom-property indirection so the browser handles
  // `prefers-color-scheme` reactivity natively. rn-web's `normalizeColor`
  // strips the function form to `undefined` (transparent), but it accepts
  // `var()` (see its `isWebColor` predicate). Dynamic branches with theme
  // sentinels fall through to the runtime resolver instead.
  //
  // Property names emitted into a CSS class block flow through rn-web's
  // `hyphenateStyleName` (camelCase → kebab-case), which mangles the
  // custom-property name without touching the `var()` reference. CSS
  // custom properties are case-sensitive, so a mismatched name dangles
  // silently. Pre-hyphenate the suffix here so the declaration and its
  // reference both end up kebab-case.
  //
  // Also emit `color-scheme: light dark` on the same element. The CSS
  // `light-dark()` function only resolves to its second argument when
  // the used color-scheme includes `dark`; without an explicit opt-in
  // it defaults to `normal`, which always picks the first (light) arg.
  // Declaring it per-element guarantees correct resolution regardless of
  // whether the host app set `<meta name="color-scheme">` on the
  // document or applied an inline style on `:root`. The value is
  // inherited, so a single declaration covers the element's subtree.
  if (
    __NATIVE_WEB__ &&
    rawValue.length > 'light-dark('.length &&
    rawValue.charCodeAt(0) === 0x6c /* l */ &&
    rawValue.startsWith('light-dark(') &&
    rawValue.indexOf('\0') === -1
  ) {
    const varName = '--sc-ld-' + hyphenateStyleName(camel);
    return {
      [camel]: 'var(' + varName + ')',
      [varName]: rawValue,
      colorScheme: 'light dark',
    };
  }

  // Tokens are needed for shorthand expansion AND for the static math /
  // color polyfill checks below. Tokenize once; reuse across paths.
  let tokens: Token[] | null = null;

  const shorthand = getShorthand(camel);
  if (shorthand !== undefined) {
    tokens = tokenize(rawValue);
    const out = shorthand(tokens);
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

  // Static math fns: fold on native always. On rn-web only fold unitless
  // results (RN's "bare number = px" convention); with-unit forms reach
  // the browser so layout-dependent arms compute against the right
  // containing block.
  if (mightBeMathFn(rawValue)) {
    tokens = tokens ?? tokenize(rawValue);
    if (tokens.length === 1 && tokens[0].kind === TokenKind.Function) {
      const numeric = resolveStaticMathFunction(tokens[0]);
      if (numeric !== null) {
        if (!__NATIVE_WEB__ || numeric.unit === '') {
          return { [camel]: numericResultToRn(numeric) };
        }
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
    // Static fold bailed. The runtime resolver path handles
    // sentinel-bearing dynamics (theme tokens). Anything else here is
    // either relative-color syntax (`oklch(from red l c h)`), a
    // `calc()` with dynamic units in a channel (`sign(1em - 10px)`),
    // or an unrecognized colorspace; none of which RN's normalizeColor
    // can interpret. Flag the value before it silently renders as
    // transparent. The dedupeSuffix is the value itself so repeat
    // declarations don't spam.
    if (__DEV__ && rawValue.indexOf('\0') === -1) {
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

function mightBeModernColor(v: string): boolean {
  // Cheap prefix check; modern function forms RN doesn't understand:
  // `oklch(`, `oklab(`, `lch(`, `lab(`, `color-mix(`, `color(`.
  // RN already handles hex / rgb / hsl / hwb at runtime; no polyfill
  // needed for those. Longest prefix is `color-mix(` (10).
  if (v.length < 5) return false;
  const haystack = hasUpperInPrefix(v, 10) ? v.toLowerCase() : v;
  const c0 = haystack.charCodeAt(0);
  if (c0 === 0x6f /* o */) return haystack.startsWith('oklch(') || haystack.startsWith('oklab(');
  if (c0 === 0x6c /* l */) return haystack.startsWith('lch(') || haystack.startsWith('lab(');
  if (c0 === 0x63 /* c */)
    return haystack.startsWith('color-mix(') || haystack.startsWith('color(');
  return false;
}
