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
 * NUMBER (bare; stylis/cssTN behavior, emits as-is), PERCENT, theme
 * SENTINEL (resolved at render time), or a deferred CSS Function (`env`,
 * `calc`, `min`, `max`, `clamp`, `light-dark`) that the runtime resolver
 * pipeline picks up after shorthand expansion.
 * Returns the token or `null` on mismatch.
 */
export function consumeDimensionLike(stream: TokenStream): Token | null {
  const t = stream.peek();
  if (!t || acceptDimensionLike(t) === null) return null;
  stream.consume();
  return t;
}

/**
 * Read the next "color-like" token: hex, color keyword, color function,
 * `currentColor`. Conservative; anything RN's normalize-colors accepts.
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
  // Theme sentinels (`\0sc:colors.fg:#000`) are opaque color placeholders;
  // the resolver pass converts them at render time.
  if (t.kind === TokenKind.Sentinel) {
    stream.consume();
    return t;
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
 * Directional 1-4 expansion. Pre-computed `keys` avoid per-call string
 * concat (`prefix + dir + suffix`) which was a measurable cold-path cost.
 * Single-value form emits `bareKey` for CSSTN parity (`{borderWidth: 10}`).
 */
export function directional(
  tokens: Token[],
  bareKey: string,
  keys: readonly [string, string, string, string]
): Dict<any> | null {
  const stripped = withoutSlashes(tokens);
  const len = stripped.length;
  if (len < 1 || len > 4) return null;
  const values: Token[] = new Array(len);
  for (let i = 0; i < len; i++) {
    const t = acceptDimensionLike(stripped[i]);
    if (t === null) return null;
    values[i] = t;
  }
  if (len === 1) return { [bareKey]: tokenToValue(values[0]) };
  // 1→aaaa  2→abab  3→abcb  4→abcd
  const top = values[0];
  const right = values[1];
  const bottom = len >= 3 ? values[2] : top;
  const left = len === 4 ? values[3] : right;
  return {
    [keys[0]]: tokenToValue(top),
    [keys[1]]: tokenToValue(right),
    [keys[2]]: tokenToValue(bottom),
    [keys[3]]: tokenToValue(left),
  };
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

/** Predicate-only form for callers that already hold the token. */
function acceptDimensionLike(t: Token): Token | null {
  const k = t.kind;
  if (k === TokenKind.Length || k === TokenKind.Number || k === TokenKind.Percent) return t;
  if (k === TokenKind.Sentinel) return t;
  if (k === TokenKind.Ident && t.name === 'auto') return t;
  if (k === TokenKind.Function) {
    const name = t.name || '';
    if (name === 'env' || name === 'calc' || name === 'min' || name === 'max' || name === 'clamp') {
      return t;
    }
  }
  return null;
}

/**
 * Small named-color set (practical, not exhaustive). RN's normalize-colors
 * has the full list; we only use this to *recognize* idents as colors for
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
