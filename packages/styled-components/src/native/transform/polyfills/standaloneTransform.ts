import { Dict } from '../../../types';
import { warnOnce } from '../dev';
import { consumeDimensionLike, tokenToValue, withoutSlashes } from '../shorthandHelpers';
import { register } from '../shorthands';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

/**
 * Standalone `translate` / `rotate` / `scale` (CSS Transforms 2 §3).
 * RN 0.85 has these names only inside the `transform` array; we lower
 * to a CSS transform string (parsed by RN 0.74+). Composition with an
 * authored `transform:` is cascade-last-wins; not merged here.
 */

function dimToCss(t: Token): string {
  const v = tokenToValue(t);
  if (typeof v === 'number') return v === 0 ? '0' : v + 'px';
  return String(v);
}

function warn3DDrop(code: string, prop: string): void {
  if (!__DEV__) return;
  warnOnce(
    code,
    '`' +
      prop +
      ': x y z` 3D form is partially supported on RN;the Z component is dropped. The declaration still reaches rn-web where it works as expected.',
    prop + '-3d'
  );
}

function translateShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  const x = consumeDimensionLike(stream);
  if (x === null) return null;
  if (stream.eof()) return { transform: 'translateX(' + dimToCss(x) + ')' };
  const y = consumeDimensionLike(stream);
  if (y === null) return null;
  const xy = 'translate(' + dimToCss(x) + ', ' + dimToCss(y) + ')';
  if (stream.eof()) return { transform: xy };
  const z = consumeDimensionLike(stream);
  if (z === null || !stream.eof()) return null;
  warn3DDrop('native-translate-3d', 'translate');
  return { transform: xy };
}

const ROTATE_AXIS = new Set(['x', 'y', 'z']);

function rotateShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  const first = stream.peek();
  if (!first) return null;

  if (first.kind === TokenKind.Ident && first.name !== undefined && ROTATE_AXIS.has(first.name)) {
    const axis = first.name;
    stream.consume();
    const angle = stream.consume();
    if (!angle || angle.kind !== TokenKind.Angle || !stream.eof()) return null;
    return { transform: 'rotate' + axis.toUpperCase() + '(' + angle.raw + ')' };
  }

  const angle = stream.consume();
  if (!angle || angle.kind !== TokenKind.Angle || !stream.eof()) return null;
  return { transform: 'rotate(' + angle.raw + ')' };
}

function consumeNumericFactor(stream: TokenStream): number | null {
  const t = stream.consume();
  if (!t) return null;
  if (t.kind === TokenKind.Number) return t.value!;
  if (t.kind === TokenKind.Percent) return t.value! / 100;
  return null;
}

function scaleShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  const xv = consumeNumericFactor(stream);
  if (xv === null) return null;
  if (stream.eof()) return { transform: 'scale(' + xv + ')' };

  const yv = consumeNumericFactor(stream);
  if (yv === null) return null;
  // RN's processTransform string parser routes `scale(x, y)` through its
  // default case where the comma-string fails the typeof === 'number'
  // invariant. Emit scaleX + scaleY individually so RN's array form
  // accepts the values.
  const xy = 'scaleX(' + xv + ') scaleY(' + yv + ')';
  if (stream.eof()) return { transform: xy };

  const zv = consumeNumericFactor(stream);
  if (zv === null || !stream.eof()) return null;
  warn3DDrop('native-scale-3d', 'scale');
  return { transform: xy };
}

register('translate', translateShorthand);
register('rotate', rotateShorthand);
register('scale', scaleShorthand);
