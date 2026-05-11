import { Dict } from '../../../types';
import {
  consumeDimensionLike,
  directional,
  tokenToValue,
  withoutSlashes,
} from '../shorthandHelpers';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

// Pre-computed key sets; avoids per-call `prefix + dir + suffix`
// concatenation that showed up as ~6% of cold-compile time.
const MARGIN_KEYS = ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'] as const;
const PADDING_KEYS = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const;
const BORDER_WIDTH_KEYS = [
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
] as const;
const BORDER_RADIUS_KEYS = [
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
] as const;

export function marginShorthand(tokens: Token[]) {
  return directional(tokens, 'margin', MARGIN_KEYS);
}

export function paddingShorthand(tokens: Token[]) {
  return directional(tokens, 'padding', PADDING_KEYS);
}

/** `border-width: X [Y [Z [W]]]` → four directional widths. */
export function borderWidthShorthand(tokens: Token[]) {
  return directional(tokens, 'borderWidth', BORDER_WIDTH_KEYS);
}

/** `border-radius: X [Y [Z [W]]]` (simple form; no slash-separated
 * second-axis radii, which RN can't express individually). */
export function borderRadiusShorthand(tokens: Token[]) {
  return directional(tokens, 'borderRadius', BORDER_RADIUS_KEYS);
}

/**
 * `gap` (CSS Box Alignment 3 §8.3). RN 0.85 has native `gap` (single
 * value) plus separate `rowGap` / `columnGap`; the two-value shorthand
 * splits accordingly.
 */
export function gapShorthand(tokens: Token[]): Dict<any> | null {
  if (tokens.length === 1 && tokens[0].kind === TokenKind.Ident && tokens[0].name === 'normal') {
    return { gap: 'normal' };
  }
  const stream = new TokenStream(withoutSlashes(tokens));
  const first = consumeDimensionLike(stream);
  if (first === null) return null;
  if (stream.eof()) return { gap: tokenToValue(first) };
  const second = consumeDimensionLike(stream);
  if (second === null || !stream.eof()) return null;
  return { rowGap: tokenToValue(first), columnGap: tokenToValue(second) };
}
