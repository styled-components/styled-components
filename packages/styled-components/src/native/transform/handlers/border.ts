import { Dict } from '../../../types';
import { warnOnce } from '../dev';
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
const RN_OUTLINE_STYLES = new Set(['solid', 'dotted', 'dashed']);
const WEB_ONLY_OUTLINE_STYLES = new Set(['auto', 'double', 'groove', 'ridge', 'inset', 'outset']);

/**
 * `border: <width> || <style> || <color>`; order-agnostic composite.
 * v7 fix vs. CSSTN: `border: none` now emits `borderStyle: 'none'`
 * (not `'solid'`), matching web.
 */
export function borderShorthand(tokens: Token[]): Dict<any> | null {
  if (tokens.length === 1 && tokens[0].kind === TokenKind.Ident && tokens[0].name === 'none') {
    return { borderWidth: 0, borderStyle: 'none', borderColor: 'transparent' };
  }
  const stream = new TokenStream(withoutSlashes(tokens));
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
 * `outline: <width> || <style> || <color>` (CSS UI 4 §6). RN 0.85 has
 * the longhands but not the shorthand; outlineStyle on RN is restricted
 * to solid / dotted / dashed. Web-only styles warn and pass through so
 * rn-web honors them.
 */
export function outlineShorthand(tokens: Token[]): Dict<any> | null {
  if (tokens.length === 1 && tokens[0].kind === TokenKind.Ident && tokens[0].name === 'none') {
    return { outlineWidth: 0, outlineStyle: 'solid', outlineColor: 'transparent' };
  }
  const stream = new TokenStream(withoutSlashes(tokens));
  let width: Token | null = null;
  let style: string | null = null;
  let color: Token | null = null;

  while (!stream.eof()) {
    const t = stream.peek()!;
    if (t.kind === TokenKind.Ident) {
      const name = t.name!;
      const webOnly = WEB_ONLY_OUTLINE_STYLES.has(name);
      if (webOnly || RN_OUTLINE_STYLES.has(name)) {
        if (style !== null) return null;
        style = name;
        stream.consume();
        if (webOnly) {
          warnOnce(
            'native-outline-style',
            '`outline-style: ' +
              name +
              "` is web-only; React Native only renders 'solid' / 'dotted' / 'dashed'. The declaration still reaches rn-web where it works as expected.",
            name
          );
        }
        continue;
      }
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
    return null;
  }

  if (width === null && style === null && color === null) return null;
  const out: Dict<any> = {};
  if (width !== null) out.outlineWidth = tokenToValue(width);
  if (style !== null) out.outlineStyle = style;
  if (color !== null) out.outlineColor = color.raw;
  return out;
}

/**
 * `border-style: <style>`; RN only accepts a single style, not per-side.
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
