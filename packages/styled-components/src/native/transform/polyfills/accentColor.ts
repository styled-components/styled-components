import { Dict } from '../../../types';
import { consumeColor, colorTokenToRnStyleValue } from '../shorthandHelpers';
import { register } from '../shorthands';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';
import { staticColorFunctionToHex } from './colorMath';
import { getSystemColorPlatformColor, isCssSystemColorKeyword } from './systemColors';

/**
 * Fold a color token to a value rn-web's track-color pipeline accepts.
 * rn-web's `normalizeColor` only understands hex, rgb/rgba, hsl, named
 * keywords, `currentcolor` / `inherit`, and anything starting with
 * `var(`. Modern color functions (`oklch`, `color-mix`, `lab`, `lch`)
 * fall through and get dropped, so we fold them to a hex statically.
 * CSS system color keywords (`LinkText`, `Canvas`, ...) ride through
 * via `var(--unset, <keyword>)` so the browser resolves them
 * dynamically against the OS theme.
 */
function foldForRnWebTrackColor(tok: Token): string | null {
  if (tok.kind === TokenKind.Hash) return tok.raw;
  if (tok.kind === TokenKind.Ident) {
    if (isCssSystemColorKeyword(tok.name!)) return `var(--unset, ${tok.raw})`;
    return tok.raw;
  }
  if (tok.kind === TokenKind.Function) {
    return staticColorFunctionToHex(tok);
  }
  return null;
}

/** `accent-color: auto | <color>`. Lifts trackColor.true on Switch and
 *  keeps `accentColor` in the style bag so attrs callbacks can route the
 *  value onto arbitrary wrapped components via `ast.pop('accentColor')`. */
function accentColorHandler(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const first = stream.peek();
  if (!first) return null;

  if (first.kind === TokenKind.Ident && first.name === 'auto') {
    stream.consume();
    if (!stream.eof()) return null;
    if (__NATIVE_WEB__) return { accentColor: 'auto' };
    const resolved = getSystemColorPlatformColor('AccentColor');
    return { accentColor: resolved, trackColor: { true: resolved } };
  }

  const colorTok = consumeColor(stream);
  if (colorTok === null || !stream.eof()) return null;
  // rn-web's Switch renders its visible track via overlaid Views, not
  // the underlying <input type="checkbox">, so CSS `accent-color`
  // alone doesn't tint the visible surface. Lift `trackColor.true` on
  // both paths, routing modern color functions and system keywords
  // through values rn-web's color pipeline accepts.
  if (__NATIVE_WEB__) {
    const folded = foldForRnWebTrackColor(colorTok);
    const cssAccent =
      colorTok.kind === TokenKind.Ident && isCssSystemColorKeyword(colorTok.name!)
        ? `var(--unset, ${colorTok.raw})`
        : colorTok.raw;
    if (folded === null) return { accentColor: cssAccent };
    return { accentColor: cssAccent, trackColor: { true: folded } };
  }
  const resolved = colorTokenToRnStyleValue(colorTok);
  return { accentColor: resolved, trackColor: { true: resolved } };
}

register('accentColor', accentColorHandler);
