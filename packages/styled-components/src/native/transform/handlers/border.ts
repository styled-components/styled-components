import { Dict } from '../../../types';
import {
  consumeColor,
  consumeDimensionLike,
  directionalColor,
  tokenToValue,
  withoutSlashes,
} from '../shorthandHelpers';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

const BORDER_COLOR_KEYS = [
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
] as const;
const VALID_BORDER_STYLES = new Set(['solid', 'dotted', 'dashed', 'none']);

/**
 * `border: <width> || <style> || <color>` — order-agnostic composite.
 * v7 fix vs. CSSTN: `border: none` now emits `borderStyle: 'none'`
 * (not `'solid'`), matching web.
 */
export function borderShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));

  // `border: none` short-circuit
  const snap = stream.save();
  const first = stream.peek();
  if (
    first &&
    first.kind === TokenKind.Ident &&
    first.name === 'none' &&
    stream.tokens.length === 1
  ) {
    return { borderWidth: 0, borderStyle: 'none', borderColor: 'transparent' };
  }
  stream.rewind(snap);

  let width: Token | null = null;
  let style: string | null = null;
  let color: Token | null = null;

  while (!stream.eof()) {
    const t = stream.peek()!;
    if (t.kind === TokenKind.Ident && VALID_BORDER_STYLES.has(t.name!)) {
      if (style !== null) return null;
      style = t.name!;
      stream.consume();
      continue;
    }
    if (width === null) {
      const w = consumeDimensionLike(stream);
      if (w !== null) {
        width = w;
        continue;
      }
    }
    if (color === null) {
      const c = consumeColor(stream);
      if (c !== null) {
        color = c;
        continue;
      }
    }
    return null; // unrecognized token
  }

  const out: Dict<any> = {};
  out.borderWidth = width !== null ? tokenToValue(width) : 1;
  out.borderStyle = style !== null ? style : 'solid';
  out.borderColor = color !== null ? color.raw : 'black';
  return out;
}

/** `border-color: <color> [<color> [<color> [<color>]]]`. */
export function borderColorShorthand(tokens: Token[]) {
  return directionalColor(tokens, 'borderColor', BORDER_COLOR_KEYS);
}

/**
 * `border-style: <style>` — RN only accepts a single style, not per-side.
 * When multiple styles are supplied, we dev-warn and use the first.
 */
export function borderStyleShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  const t = stream.peek();
  if (!t || t.kind !== TokenKind.Ident || !VALID_BORDER_STYLES.has(t.name!)) {
    return null;
  }
  return { borderStyle: t.name! };
}
