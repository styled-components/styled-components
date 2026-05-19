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

  return { ellipsizeMode: name === 'ellipsis' ? 'tail' : 'clip' };
}

register('textOverflow', textOverflowShorthand);
