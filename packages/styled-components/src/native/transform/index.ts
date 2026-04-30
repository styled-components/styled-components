import { Dict } from '../../types';
import * as $ from '../../utils/charCodes';
import { warnOnce } from './dev';
import { PASSTHROUGH_PROPS } from './passthrough';
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
function camelize(prop: string): string {
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

  const passthroughKey = PASSTHROUGH_PROPS.get(camel);
  if (passthroughKey !== undefined) {
    return { [passthroughKey]: rawValue };
  }

  // Single-token sentinel values (e.g. `color: ${t.colors.fg}` produces
  // exactly one `\0sc:…` atom) bypass shorthand expansion; they're atomic
  // placeholders that the render-time resolver replaces with the concrete
  // theme value. Multi-token values containing a sentinel as one component
  // (e.g. `border: ${t.borderWidth.hairline}px solid ${t.colors.ink}`)
  // must NOT bypass — they need shorthand expansion so each part lands on
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
    const out = shorthand(tokens);
    if (out !== null) return out;
    if (process.env.NODE_ENV !== 'production') {
      warnOnce(
        `${camel}:${rawValue}`,
        `The value "${rawValue}" could not be parsed for property "${camel}". The declaration was ignored.`
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
  // `color-mix`) → hex. Same prefix-then-tokenize pattern.
  if (mightBeModernColor(rawValue)) {
    tokens = tokens ?? tokenize(rawValue);
    if (tokens.length === 1 && tokens[0].kind === TokenKind.Function) {
      const hex = staticColorFunctionToHex(tokens[0]);
      if (hex !== null) return { [camel]: hex };
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
  // Cheap prefix check; `oklch(`, `oklab(`, `lch(`, `lab(`, `color-mix(`.
  // RN already handles hex / rgb / hsl / hwb; no polyfill needed for those.
  // Branch on first char so we only test the matching family.
  if (v.length < 5) return false;
  const c0 = v.charCodeAt(0);
  if (c0 === 0x6f /* o */) return v.startsWith('oklch(') || v.startsWith('oklab(');
  if (c0 === 0x6c /* l */) return v.startsWith('lch(') || v.startsWith('lab(');
  if (c0 === 0x63 /* c */) return v.startsWith('color-mix(');
  return false;
}
