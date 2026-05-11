import { Dict } from '../../../types';
import { register } from '../shorthands';
import { consumeDimensionLike, tokenToValue, withoutSlashes } from '../shorthandHelpers';
import { Token } from '../tokens';
import { TokenStream } from '../tokenStream';

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

function insetShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  const values = [];
  while (!stream.eof()) {
    const t = consumeDimensionLike(stream);
    if (t === null) return null;
    values.push(tokenToValue(t));
    if (values.length > 4) return null;
  }
  if (values.length === 0) return null;
  let top, right, bottom, left;
  if (values.length === 1) {
    top = right = bottom = left = values[0];
  } else if (values.length === 2) {
    top = bottom = values[0];
    right = left = values[1];
  } else if (values.length === 3) {
    top = values[0];
    right = left = values[1];
    bottom = values[2];
  } else {
    [top, right, bottom, left] = values;
  }
  return { top, right, bottom, left };
}

register('marginInline', marginInlineShorthand);
register('marginBlock', marginBlockShorthand);
register('paddingInline', paddingInlineShorthand);
register('paddingBlock', paddingBlockShorthand);
register('insetInline', insetInlineShorthand);
register('insetBlock', insetBlockShorthand);
register('inset', insetShorthand);
