import { Dict } from '../../types';
import * as $ from '../../utils/charCodes';
import hyphenateStyleName from '../../utils/hyphenateStyleName';
import { warnIfAndroidSkew, warnIfIosVerticalAlign, warnOnce } from './dev';
import { collapseIdenticalCommas, getPassthroughKeys, isLayeredCommaProp } from './passthrough';
import { staticColorFunctionToHex } from './polyfills/colorMath';
import { numericResultToRn, resolveStaticMathFunction } from './polyfills/mathFns';
import { getShorthand } from './shorthands';
import { tokenize } from './tokenize';
import { Token, TokenKind } from './tokens';
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

  const passthroughKeys = getPassthroughKeys(camel);
  if (passthroughKeys !== undefined) {
    if (__DEV__) {
      if (passthroughKeys[0] === 'transform') {
        warnIfAndroidSkew(rawValue);
      } else if (camel === 'verticalAlign') {
        warnIfIosVerticalAlign(rawValue);
      }
    }
    const value = isLayeredCommaProp(camel) ? collapseIdenticalCommas(rawValue) : rawValue;
    if (passthroughKeys.length === 1) {
      return { [passthroughKeys[0]]: value };
    }
    // Dual-emit (background props): write every key in order so the
    // host platform sees both the vendor-prefixed and standard names.
    const out: Dict<any> = {};
    for (let i = 0; i < passthroughKeys.length; i++) out[passthroughKeys[i]] = value;
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

  // Polyfill: static math fn (`clamp` / `min` / `max` / `calc`) over
  // resolvable arms. Cheap prefix gate before tokenizing.
  if (mightBeMathFn(rawValue)) {
    tokens = tokens ?? tokenize(rawValue);
    if (tokens.length === 1 && tokens[0].kind === TokenKind.Function) {
      const numeric = resolveStaticMathFunction(tokens[0]);
      if (numeric !== null) return { [camel]: numericResultToRn(numeric) };
    }
  }

  // Polyfill: static color fn (`oklch` / `oklab` / `lch` / `lab` /
  // `color-mix` / `color`) → hex. Same prefix-then-tokenize pattern. The
  // fold runs on every host: rn-web's `normalizeColor` only recognises
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
    // or an unrecognised colorspace — none of which RN's normalizeColor
    // can interpret. Flag the value before it silently renders as
    // transparent. The dedupeSuffix is the value itself so repeat
    // declarations don't spam.
    if (__DEV__ && rawValue.indexOf('\0') === -1) {
      warnOnce(
        'native-modern-color-cant-fold',
        `the value "${rawValue}" for property "${camel}" uses a modern color form that couldn't be statically resolved for React Native. ` +
          `Likely cause: relative-color syntax (e.g. \`oklch(from red l c h)\`), \`calc()\` with dynamic units inside a channel, or an unsupported colorspace. ` +
          `RN's color parser doesn't recognise these — the value would render as transparent. Substitute a literal \`#hex\` / \`rgb()\` / \`hsl()\`, or fold the math up front.`,
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

function mightBeMathFn(v: string): boolean {
  // Cheap prefix check before tokenizing; avoids work on `10px` etc.
  // Branch on first char so we only run the relevant startsWith calls.
  if (v.length <= 4) return false;
  const c0 = v.charCodeAt(0);
  if (c0 === 0x63 /* c */) return v.startsWith('calc(') || v.startsWith('clamp(');
  if (c0 === 0x6d /* m */) return v.startsWith('min(') || v.startsWith('max(');
  return false;
}

function mightBeModernColor(v: string): boolean {
  // Cheap prefix check; modern function forms RN doesn't understand:
  // `oklch(`, `oklab(`, `lch(`, `lab(`, `color-mix(`, `color(`.
  // RN already handles hex / rgb / hsl / hwb at runtime; no polyfill
  // needed for those.
  if (v.length < 5) return false;
  const c0 = v.charCodeAt(0);
  if (c0 === 0x6f /* o */) return v.startsWith('oklch(') || v.startsWith('oklab(');
  if (c0 === 0x6c /* l */) return v.startsWith('lch(') || v.startsWith('lab(');
  if (c0 === 0x63 /* c */) return v.startsWith('color-mix(') || v.startsWith('color(');
  return false;
}
