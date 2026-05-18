import { Dict } from '../../../types';
import { register } from '../shorthands';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

/**
 * `line-clamp` / `-webkit-line-clamp` → RN `numberOfLines`.
 * RN's Text only renders the default `…` ellipsis; `<block-ellipsis>` and
 * `-webkit-legacy` parse-accept but emit nothing. `numberOfLines: 0` is
 * RN's sentinel for unlimited.
 */
function lineClampShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const first = stream.consume();
  if (!first) return null;

  if (first.kind === TokenKind.Ident && first.name === 'none') {
    if (!stream.eof()) return null;
    return { numberOfLines: 0 };
  }

  let lines: number | null = null;

  let cur: Token | null = first;
  while (cur !== null) {
    if (cur.kind === TokenKind.Number) {
      if (lines !== null) return null;
      const n = cur.value!;
      if (!Number.isInteger(n) || n < 1) return null;
      lines = n;
    } else if (cur.kind === TokenKind.String) {
      // <block-ellipsis>; accepted for compliance, dropped on emit.
    } else if (cur.kind === TokenKind.Op && cur.op === '-') {
      // Tokenizer splits `-webkit-legacy` as `Op(-) Ident(webkit-legacy)`.
      const next = stream.consume();
      if (!next || next.kind !== TokenKind.Ident || next.name !== 'webkit-legacy') return null;
    } else {
      return null;
    }
    cur = stream.consume() ?? null;
  }

  if (lines === null) return null;
  return { numberOfLines: lines, overflow: 'hidden' };
}

register('lineClamp', lineClampShorthand);
