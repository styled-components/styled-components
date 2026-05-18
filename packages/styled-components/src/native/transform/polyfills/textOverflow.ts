import { Dict } from '../../../types';
import { register } from '../shorthands';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

/** `text-overflow: clip | ellipsis`. Lifts ellipsizeMode onto Text. */
function textOverflowShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const t = stream.consume();
  if (!t || t.kind !== TokenKind.Ident || !stream.eof()) return null;
  const name = t.name;
  if (name !== 'clip' && name !== 'ellipsis') return null;

  // text-overflow only takes effect when the line cannot wrap and the
  // box clips content. On rn-web emit `overflow: hidden` alongside the
  // declaration so a paired `text-wrap: nowrap` reaches the spec
  // behavior without the user setting overflow themselves; the native
  // path achieves the same shape via numberOfLines + ellipsizeMode.
  if (__NATIVE_WEB__) return { textOverflow: name, overflow: 'hidden' };
  return { ellipsizeMode: name === 'ellipsis' ? 'tail' : 'clip' };
}

register('textOverflow', textOverflowShorthand);
