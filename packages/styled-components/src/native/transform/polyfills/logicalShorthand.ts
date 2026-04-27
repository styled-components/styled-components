import { Dict } from '../../../types';
import { register } from '../shorthands';
import { consumeDimensionLike, tokenToValue, withoutSlashes } from '../shorthandHelpers';
import { Token } from '../tokens';
import { TokenStream } from '../tokenStream';

/**
 * `margin-inline`, `margin-block`, `padding-inline`, `padding-block` —
 * CSS logical shorthands that RN doesn't natively parse. Expand to the
 * corresponding logical longhands (`marginStart`/`marginEnd`,
 * `marginTop`/`marginBottom`, etc.) which RN has supported since 0.66-0.70.
 */

function twoValue(tokens: Token[], startKey: string, endKey: string): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  const first = consumeDimensionLike(stream);
  if (first === null) return null;
  let second = first;
  if (!stream.eof()) {
    const s = consumeDimensionLike(stream);
    if (s === null) return null;
    second = s;
  }
  if (!stream.eof()) return null;
  return {
    [startKey]: tokenToValue(first),
    [endKey]: tokenToValue(second),
  };
}

function marginInlineShorthand(tokens: Token[]) {
  return twoValue(tokens, 'marginStart', 'marginEnd');
}
function marginBlockShorthand(tokens: Token[]) {
  return twoValue(tokens, 'marginTop', 'marginBottom');
}
function paddingInlineShorthand(tokens: Token[]) {
  return twoValue(tokens, 'paddingStart', 'paddingEnd');
}
function paddingBlockShorthand(tokens: Token[]) {
  return twoValue(tokens, 'paddingTop', 'paddingBottom');
}
function insetInlineShorthand(tokens: Token[]) {
  return twoValue(tokens, 'insetInlineStart', 'insetInlineEnd');
}
function insetBlockShorthand(tokens: Token[]) {
  return twoValue(tokens, 'insetBlockStart', 'insetBlockEnd');
}

register('marginInline', marginInlineShorthand);
register('marginBlock', marginBlockShorthand);
register('paddingInline', paddingInlineShorthand);
register('paddingBlock', paddingBlockShorthand);
register('insetInline', insetInlineShorthand);
register('insetBlock', insetBlockShorthand);
