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

  // text-overflow needs a clipping context; rn-web emits `overflow: hidden`
  // alongside so a paired `text-wrap: nowrap` truncates without the user
  // setting overflow themselves. Native uses numberOfLines + ellipsizeMode.
  if (__NATIVE_WEB__) return { textOverflow: name, overflow: 'hidden' };
  return { ellipsizeMode: name === 'ellipsis' ? 'tail' : 'clip' };
}

register('textOverflow', textOverflowShorthand);
