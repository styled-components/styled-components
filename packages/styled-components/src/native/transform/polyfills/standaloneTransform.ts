import { Dict } from '../../../types';
import { warnOnce } from '../dev';
import { consumeDimensionLike, tokenToValue, withoutSlashes } from '../shorthandHelpers';
import { register } from '../shorthands';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

/**
 * Standalone `translate` / `rotate` / `scale`. RN 0.85 has these names
 * only inside the `transform` array; we lower to a CSS transform string
 * (parsed by RN 0.74+). Composition with an authored `transform:` is
 * cascade-last-wins; not merged here.
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
      ': x y z` is only partially supported on React Native. iOS and Android use the X and Y values and ignore Z; rn-web keeps the full value.',
    prop + '-3d'
  );
}

function translateShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  const x = consumeDimensionLike(stream);
  if (x === null) return null;
  if (stream.eof()) {
    if (__NATIVE_WEB__) return { translate: dimToCss(x) };
    return { transform: 'translateX(' + dimToCss(x) + ')' };
  }
  const y = consumeDimensionLike(stream);
  if (y === null) return null;
  if (stream.eof()) {
    if (__NATIVE_WEB__) return { translate: dimToCss(x) + ' ' + dimToCss(y) };
    return { transform: 'translate(' + dimToCss(x) + ', ' + dimToCss(y) + ')' };
  }
  const z = consumeDimensionLike(stream);
  if (z === null || !stream.eof()) return null;
  if (__NATIVE_WEB__) {
    return { translate: dimToCss(x) + ' ' + dimToCss(y) + ' ' + dimToCss(z) };
  }
  // RN's processTransform supports the 3-arg `translate(x, y, z)` form
  // (parses to `{ translate: [x, y, z] }`), so Z survives.
  return {
    transform: 'translate(' + dimToCss(x) + ', ' + dimToCss(y) + ', ' + dimToCss(z) + ')',
  };
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
    if (__NATIVE_WEB__) return { rotate: axis + ' ' + angle.raw };
    return { transform: 'rotate' + axis.toUpperCase() + '(' + angle.raw + ')' };
  }

  const angle = stream.consume();
  if (!angle || angle.kind !== TokenKind.Angle || !stream.eof()) return null;
  if (__NATIVE_WEB__) return { rotate: angle.raw };
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
  if (stream.eof()) {
    if (__NATIVE_WEB__) return { scale: String(xv) };
    return { transform: 'scale(' + xv + ')' };
  }

  const yv = consumeNumericFactor(stream);
  if (yv === null) return null;
  // RN's processTransform string parser routes `scale(x, y)` through its
  // default case where the comma-string fails the typeof === 'number'
  // invariant. Emit scaleX + scaleY individually so RN's array form
  // accepts the values.
  if (stream.eof()) {
    if (__NATIVE_WEB__) return { scale: xv + ' ' + yv };
    return { transform: 'scaleX(' + xv + ') scaleY(' + yv + ')' };
  }

  const zv = consumeNumericFactor(stream);
  if (zv === null || !stream.eof()) return null;
  if (__NATIVE_WEB__) return { scale: xv + ' ' + yv + ' ' + zv };
  warn3DDrop('native-scale-3d', 'scale');
  return { transform: 'scaleX(' + xv + ') scaleY(' + yv + ')' };
}

register('translate', translateShorthand);
register('rotate', rotateShorthand);
register('scale', scaleShorthand);

/**
 * `transform-box`. RN has no transform-box surface; the pivot is fixed
 * at the view's center (`transform-origin` shifts the origin point
 * relative to that). The keyword set
 * `content-box | border-box | fill-box | stroke-box | view-box` has no
 * mapping; the declaration emits a one-time dev warn and drops.
 *
 * rn-web honors the property natively (browser handles it on web).
 */
const TRANSFORM_BOX_VALUES = new Set([
  'content-box',
  'border-box',
  'fill-box',
  'stroke-box',
  'view-box',
]);

function transformBoxHandler(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const t = stream.consume();
  if (!t || t.kind !== TokenKind.Ident || !stream.eof()) return null;
  const value = t.name;
  if (value === undefined || !TRANSFORM_BOX_VALUES.has(value)) return null;

  if (__NATIVE_WEB__) return { transformBox: value };

  if (__DEV__) {
    warnOnce(
      'native-transform-box-unsupported',
      '`transform-box: ' +
        value +
        '` is ignored on React Native because transforms use the view center as their reference box. Use `transform-origin` to move the pivot. rn-web keeps `transform-box`.',
      value
    );
  }
  return {};
}

register('transformBox', transformBoxHandler);

/**
 * `perspective` standalone property. Syntax: `none | <length [0,∞]>`.
 * Initial: `none`.
 *
 * RN has no separate perspective-for-descendants attribute; the
 * closest mapping is to prepend `perspective(<length>)` to this
 * element's `transform` array, which establishes a 3D rendering
 * context for the element itself. The behavior approximates the CSS
 * property when the children carry their own 3D transforms.
 *
 * `perspective: none` clears the value; emitted as `transform: 'none'`
 * which RN treats as the identity transform.
 *
 * Lengths < 1px clamp at 1px for rendering.
 *
 * Composition with author transforms: the handler emits the sentinel
 * key `PERSPECTIVE_SENTINEL_KEY` instead of `transform` directly so a
 * post-merge fold in `compileNative.processDecls` can prepend the
 * `perspective(N)` function to any other `transform` value emitted in
 * the same declaration block. Without this indirection cascade
 * last-wins would silently drop the perspective whenever the user also
 * declares `transform:`.
 */
export const PERSPECTIVE_SENTINEL_KEY = '__sc_perspective';

function perspectiveHandler(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const t = stream.consume();
  if (!t || !stream.eof()) return null;

  // rn-web: emit the raw `perspective` property and let the browser
  // handle it as its own surface (separate from `transform`). The
  // sentinel + transform-fold is a native-only workaround for RN's
  // lack of a perspective-for-descendants surface.
  if (__NATIVE_WEB__) {
    if (t.kind === TokenKind.Ident && t.name === 'none') return { perspective: 'none' };
    if (t.kind === TokenKind.Length || t.kind === TokenKind.Number) {
      return { perspective: t.raw };
    }
    return null;
  }

  if (t.kind === TokenKind.Ident && t.name === 'none') {
    return { [PERSPECTIVE_SENTINEL_KEY]: 'none' };
  }
  if (t.kind === TokenKind.Length) {
    const v = t.value;
    if (v === undefined || v < 0) return null;
    const clamped = v < 1 ? 1 : v;
    return { [PERSPECTIVE_SENTINEL_KEY]: 'perspective(' + clamped + 'px)' };
  }
  // Bare zero is a <number>, not a length; only >=0px lengths are valid; reject.
  if (t.kind === TokenKind.Number && t.value === 0) {
    return { [PERSPECTIVE_SENTINEL_KEY]: 'perspective(1px)' };
  }
  return null;
}

register('perspective', perspectiveHandler);

/**
 * `perspective-origin: <position>`. Sets the vanishing point that
 * perspective-transformed descendants converge toward. RN 0.85 has no
 * perspective-origin surface; the vanishing point is fixed at the
 * parent's center. Drops with a one-time dev warn on iOS / Android.
 *
 * rn-web honors the property natively (browser handles the position
 * grammar end-to-end).
 */
function perspectiveOriginHandler(tokens: Token[]): Dict<any> | null {
  if (tokens.length === 0) return null;
  // We don't validate the position grammar here; both targets handle
  // their own parsing. On native, accept any non-empty input and drop
  // it with a warn so author intent is observable.
  if (__NATIVE_WEB__) {
    const raw = tokens.map(t => t.raw).join(' ');
    return { perspectiveOrigin: raw };
  }
  if (__DEV__) {
    warnOnce(
      'native-perspective-origin-unsupported',
      "`perspective-origin` is ignored on React Native. The vanishing point stays at the parent's center on iOS and Android; rn-web keeps the property."
    );
  }
  return {};
}

register('perspectiveOrigin', perspectiveOriginHandler);

/**
 * `transform-style: flat | preserve-3d`. RN 0.85 has no transformStyle
 * prop; `preserve-3d` is silently dropped on iOS / Android. The iOS
 * 3D-bleed memory documents a known compositor side-effect when nested
 * 3D transforms appear without preserve-3d. rn-web honors the property
 * natively.
 */
function transformStyleHandler(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const t = stream.consume();
  if (!t || t.kind !== TokenKind.Ident || !stream.eof()) return null;
  const value = t.name;
  if (value !== 'flat' && value !== 'preserve-3d') return null;

  if (__NATIVE_WEB__) return { transformStyle: value };

  if (__DEV__ && value === 'preserve-3d') {
    warnOnce(
      'native-transform-style-preserve-3d',
      "`transform-style: preserve-3d` is ignored on React Native because iOS and Android expose no matching style property; descendants of a 3D-transformed element composite into the parent's 2D plane. Animated 3D transforms (`rotateX` / `rotateY` / `rotateZ`) are already isolated automatically. rn-web keeps the property.",
      value
    );
  }
  return {};
}

register('transformStyle', transformStyleHandler);
