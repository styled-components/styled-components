import { Dict } from '../../types';
import { Token, TokenKind } from './tokens';
import { TokenStream } from './tokenStream';

/**
 * Strip a {@link TokenKind.Slash} interlopers from a token array so
 * 1-4 value parsers can operate on space-separated tokens cleanly.
 * Most shorthands reject slashes outright; a few (`aspect-ratio`, `font`)
 * want the slash, so they don't use this helper.
 */
export function withoutSlashes(tokens: Token[]): Token[] {
  let hasSlash = false;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].kind === TokenKind.Slash) {
      hasSlash = true;
      break;
    }
  }
  if (!hasSlash) return tokens;
  return tokens.filter(t => t.kind !== TokenKind.Slash);
}

/**
 * Read the next "value" token that counts as a length-like unit for
 * directional shorthands (margin/padding/border*): LENGTH (inc. 0),
 * NUMBER (bare — stylis/cssTN behavior, emits as-is), PERCENT.
 * Returns the token or `null` on mismatch.
 */
export function consumeDimensionLike(stream: TokenStream): Token | null {
  const t = stream.peek();
  if (!t) return null;
  if (
    t.kind === TokenKind.Length ||
    t.kind === TokenKind.Number ||
    t.kind === TokenKind.Percent ||
    (t.kind === TokenKind.Ident && t.name === 'auto')
  ) {
    stream.consume();
    return t;
  }
  return null;
}

/**
 * Read the next "color-like" token: hex, color keyword, color function,
 * `currentColor`. Conservative — anything RN's normalize-colors accepts.
 */
export function consumeColor(stream: TokenStream): Token | null {
  const t = stream.peek();
  if (!t) return null;
  if (t.kind === TokenKind.Hash) {
    stream.consume();
    return t;
  }
  if (t.kind === TokenKind.Function) {
    const name = t.name || '';
    // rgb / rgba / hsl / hsla / hwb / lab / lch / oklab / oklch / color / color-mix
    if (
      name === 'rgb' ||
      name === 'rgba' ||
      name === 'hsl' ||
      name === 'hsla' ||
      name === 'hwb' ||
      name === 'lab' ||
      name === 'lch' ||
      name === 'oklab' ||
      name === 'oklch' ||
      name === 'color' ||
      name === 'color-mix' ||
      name === 'light-dark'
    ) {
      stream.consume();
      return t;
    }
  }
  if (t.kind === TokenKind.Ident) {
    const n = t.name || '';
    if (n === 'currentcolor' || n === 'transparent' || NAMED_COLORS.has(n)) {
      stream.consume();
      return t;
    }
  }
  return null;
}

/**
 * Convert a token to the string value RN expects for that property.
 * For dimension-like tokens this is a number (or `'50%'` / `'auto'` string);
 * for colors / keywords / functions it's the raw source substring.
 */
export function tokenToValue(t: Token): number | string {
  if (t.kind === TokenKind.Length) {
    if (t.unit === 'px' || t.unit === '') return t.value!;
    if (t.value === 0) return 0;
    return t.raw;
  }
  if (t.kind === TokenKind.Number) return t.value!;
  if (t.kind === TokenKind.Percent) return t.raw;
  return t.raw;
}

/**
 * Directional 1-4 expansion helper. Given pre-computed property keys
 * (`bareKey` for the single-value fast path, `keys` for the 4-corner
 * expansion), reads 1-4 dimension-like tokens and expands per the CSS
 * shorthand rules: 1 → all, 2 → v/h, 3 → t/h/b, 4 → t/r/b/l.
 *
 * Pre-computed keys avoid per-call string concat (`prefix + dir + suffix`)
 * which was a measurable cold-path cost.
 *
 * When only ONE value is supplied AND the "bare" form is a valid single
 * RN prop (e.g. `borderWidth: 10` accepts `{borderWidth: 10}`), emits
 * the bare form for ergonomics + CSSTN parity.
 */
export function directional(
  tokens: Token[],
  bareKey: string,
  keys: readonly [string, string, string, string]
): Dict<any> | null {
  const stripped = withoutSlashes(tokens);
  const len = stripped.length;
  // Inline 1-4 token consumption without TokenStream alloc.
  let pos = 0;
  const v0 = pos < len ? acceptDimensionLike(stripped[pos]) : null;
  if (v0 === null) return null;
  pos++;
  if (pos === len) {
    return { [bareKey]: tokenToValue(v0) };
  }
  const v1 = acceptDimensionLike(stripped[pos]);
  if (v1 === null) return null;
  pos++;
  let v2: Token | null = v0;
  let v3: Token | null = v1;
  if (pos < len) {
    v2 = acceptDimensionLike(stripped[pos]);
    if (v2 === null) return null;
    pos++;
    v3 = v1;
    if (pos < len) {
      v3 = acceptDimensionLike(stripped[pos]);
      if (v3 === null) return null;
      pos++;
    }
    if (pos !== len) return null;
  }
  const out: Dict<any> = {};
  out[keys[0]] = tokenToValue(v0);
  out[keys[1]] = tokenToValue(v1);
  out[keys[2]] = tokenToValue(v2!);
  out[keys[3]] = tokenToValue(v3!);
  return out;
}

/**
 * Directional 1-4 expansion but with color tokens (borderColor).
 * Single-value emits the bare prop (RN accepts scalar `borderColor`).
 */
export function directionalColor(
  tokens: Token[],
  bareKey: string,
  keys: readonly [string, string, string, string]
): Dict<any> | null {
  const stripped = withoutSlashes(tokens);
  const stream = new TokenStream(stripped);
  const values: Token[] = [];
  while (values.length < 4 && !stream.eof()) {
    const t = consumeColor(stream);
    if (t === null) return null;
    values.push(t);
  }
  if (!stream.eof() || values.length === 0) return null;

  if (values.length === 1) {
    return { [bareKey]: values[0].raw };
  }

  const [top, right = top, bottom = top, left = right] = values;
  const out: Dict<any> = {};
  out[keys[0]] = top.raw;
  out[keys[1]] = right.raw;
  out[keys[2]] = bottom.raw;
  out[keys[3]] = left.raw;
  return out;
}

/**
 * Inline equivalent of the `consumeDimensionLike` peek+consume pattern,
 * for cases where we know the cursor position and don't need TokenStream
 * machinery. Returns the token if it's dimension-like, null otherwise.
 */
function acceptDimensionLike(t: Token): Token | null {
  const k = t.kind;
  if (k === TokenKind.Length || k === TokenKind.Number || k === TokenKind.Percent) return t;
  if (k === TokenKind.Ident && t.name === 'auto') return t;
  return null;
}

/**
 * Small named-color set (practical, not exhaustive). RN's normalize-colors
 * has the full list — we only use this to *recognize* idents as colors for
 * composite shorthands like `border: 1px solid red`, not to normalize them.
 */
const NAMED_COLORS = new Set([
  'black',
  'white',
  'red',
  'green',
  'blue',
  'yellow',
  'purple',
  'cyan',
  'magenta',
  'orange',
  'pink',
  'brown',
  'gray',
  'grey',
  'silver',
  'gold',
  'maroon',
  'olive',
  'lime',
  'aqua',
  'teal',
  'navy',
  'fuchsia',
  'rebeccapurple',
  'aliceblue',
  'antiquewhite',
  'aquamarine',
  'azure',
  'beige',
  'bisque',
  'blanchedalmond',
  'blueviolet',
  'burlywood',
  'cadetblue',
  'chartreuse',
  'chocolate',
  'coral',
  'cornflowerblue',
  'cornsilk',
  'crimson',
  'darkblue',
  'darkcyan',
  'darkgoldenrod',
  'darkgray',
  'darkgreen',
  'darkgrey',
  'darkkhaki',
  'darkmagenta',
  'darkolivegreen',
  'darkorange',
  'darkorchid',
  'darkred',
  'darksalmon',
  'darkseagreen',
  'darkslateblue',
  'darkslategray',
  'darkslategrey',
  'darkturquoise',
  'darkviolet',
  'deeppink',
  'deepskyblue',
  'dimgray',
  'dimgrey',
  'dodgerblue',
  'firebrick',
  'floralwhite',
  'forestgreen',
  'gainsboro',
  'ghostwhite',
  'goldenrod',
  'greenyellow',
  'honeydew',
  'hotpink',
  'indianred',
  'indigo',
  'ivory',
  'khaki',
  'lavender',
  'lavenderblush',
  'lawngreen',
  'lemonchiffon',
  'lightblue',
  'lightcoral',
  'lightcyan',
  'lightgoldenrodyellow',
  'lightgray',
  'lightgreen',
  'lightgrey',
  'lightpink',
  'lightsalmon',
  'lightseagreen',
  'lightskyblue',
  'lightslategray',
  'lightslategrey',
  'lightsteelblue',
  'lightyellow',
  'limegreen',
  'linen',
  'mediumaquamarine',
  'mediumblue',
  'mediumorchid',
  'mediumpurple',
  'mediumseagreen',
  'mediumslateblue',
  'mediumspringgreen',
  'mediumturquoise',
  'mediumvioletred',
  'midnightblue',
  'mintcream',
  'mistyrose',
  'moccasin',
  'navajowhite',
  'oldlace',
  'olivedrab',
  'orangered',
  'orchid',
  'palegoldenrod',
  'palegreen',
  'paleturquoise',
  'palevioletred',
  'papayawhip',
  'peachpuff',
  'peru',
  'plum',
  'powderblue',
  'rosybrown',
  'royalblue',
  'saddlebrown',
  'salmon',
  'sandybrown',
  'seagreen',
  'seashell',
  'sienna',
  'skyblue',
  'slateblue',
  'slategray',
  'slategrey',
  'snow',
  'springgreen',
  'steelblue',
  'tan',
  'thistle',
  'tomato',
  'turquoise',
  'violet',
  'wheat',
  'whitesmoke',
  'yellowgreen',
]);
