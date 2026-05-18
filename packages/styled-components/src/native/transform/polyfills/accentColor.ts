import { Dict } from '../../../types';
import { consumeColor, colorTokenToRnStyleValue } from '../shorthandHelpers';
import { register } from '../shorthands';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';
import { staticColorFunctionToHex } from './colorMath';
import { getSystemColorPlatformColor } from './systemColors';

// rn-web's track-color pipeline rejects modern color functions; fold them
// to hex up front. Other token kinds reuse `colorTokenToRnStyleValue`,
// which already handles the system-keyword var() wrap.
function foldForRnWebTrackColor(tok: Token): string | null {
  if (tok.kind === TokenKind.Function) return staticColorFunctionToHex(tok);
  if (tok.kind === TokenKind.Hash || tok.kind === TokenKind.Ident) {
    return colorTokenToRnStyleValue(tok) as string;
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
  // rn-web's Switch paints its visible track via overlaid Views (not the
  // underlying <input>), so CSS `accent-color` alone doesn't tint it.
  // Lift `trackColor.true` on both paths, routing through values rn-web's
  // color pipeline accepts.
  if (__NATIVE_WEB__) {
    const cssAccent = colorTokenToRnStyleValue(colorTok) as string;
    const folded = foldForRnWebTrackColor(colorTok);
    if (folded === null) return { accentColor: cssAccent };
    return { accentColor: cssAccent, trackColor: { true: folded } };
  }
  const resolved = colorTokenToRnStyleValue(colorTok);
  return { accentColor: resolved, trackColor: { true: resolved } };
}

register('accentColor', accentColorHandler);
