import { Dict } from '../../../types';
import { register } from '../shorthands';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

/**
 * `line-clamp: N` / `-webkit-line-clamp: N` → RN `numberOfLines: N`.
 * RN's Text component reads `numberOfLines` directly; we attach
 * `overflow: 'hidden'` too so containers (View) render the same
 * truncation expectation.
 */
function lineClampShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const t = stream.consume();
  if (!t || t.kind !== TokenKind.Number) return null;
  if (!stream.eof()) return null;
  const n = t.value!;
  if (!Number.isInteger(n) || n < 0) return null;
  return { numberOfLines: n, overflow: 'hidden' };
}

register('lineClamp', lineClampShorthand);
