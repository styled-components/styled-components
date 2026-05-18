import { Dict } from '../../../types';
import { consumeColor, colorTokenToRnStyleValue } from '../shorthandHelpers';
import { register } from '../shorthands';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';
import { getSystemColorPlatformColor } from './systemColors';

/** `accent-color: auto | <color>`. Lifts trackColor.true on Switch and
 *  keeps `accentColor` in the style bag so attrs callbacks can route the
 *  value onto arbitrary wrapped components via `ast.pop('accentColor')`. */
function accentColorHandler(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const first = stream.peek();
  if (!first) return null;

  let resolved: unknown;
  if (first.kind === TokenKind.Ident && first.name === 'auto') {
    stream.consume();
    if (!stream.eof()) return null;
    if (__NATIVE_WEB__) return { accentColor: 'auto' };
    resolved = getSystemColorPlatformColor('AccentColor');
  } else {
    const colorTok = consumeColor(stream);
    if (colorTok === null || !stream.eof()) return null;
    if (__NATIVE_WEB__) return { accentColor: colorTok.raw };
    resolved = colorTokenToRnStyleValue(colorTok);
  }

  return { accentColor: resolved, trackColor: { true: resolved } };
}

register('accentColor', accentColorHandler);
