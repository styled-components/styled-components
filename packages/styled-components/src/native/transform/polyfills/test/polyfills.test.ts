import { resetWarningsForTest } from '../../dev';
import { transformDecl } from '../../index';
import { tokenize } from '../../tokenize';
import { TokenKind } from '../../tokens';
import { staticColorFunctionToHex } from '../colorMath';
import { parseLinearEasing } from '../linearEasing';
import { resolveStaticMathFunction } from '../mathFns';
import { buildResolver } from '../resolvers';
import {
  __resetGenericFamilyCacheForTest,
  isGenericFamily,
  resolveGenericFamily,
} from '../genericFamily';
import { Platform } from 'react-native';
import { describeOnRnWeb } from '../../describeOnRnWeb';

describe('logical properties spec compliance (CSS Logical Properties Level 1 §4)', () => {
  // Spec source: https://drafts.csswg.org/css-logical-1/
  // Polyfill scope on RN: shorthand expansion for margin-inline /
  // margin-block / padding-inline / padding-block / inset-inline /
  // inset-block (1-2 values), the four-value inset shorthand, and
  // longhand passthrough. RN's Yoga (0.71+) supports the *Block* /
  // *Inline* longhands directly, so they pass through unchanged.

  describe('§4.2 margin-block / margin-inline shorthands', () => {
    // Spec: `margin-block, margin-inline = <margin-top>{1,2}` ;
    // "The first value represents the start edge style, and the second
    // value represents the end edge style. If only one value is given,
    // it applies to both the start and end edges."

    it('margin-inline single value applies to both edges', () => {
      expect(transformDecl('margin-inline', '10px')).toEqual({
        marginStart: 10,
        marginEnd: 10,
      });
    });

    it('margin-inline two values: start, end', () => {
      expect(transformDecl('margin-inline', '10px 20px')).toEqual({
        marginStart: 10,
        marginEnd: 20,
      });
    });

    it('margin-block single value applies to both edges', () => {
      expect(transformDecl('margin-block', '8px')).toEqual({
        marginTop: 8,
        marginBottom: 8,
      });
    });

    it('margin-block two values: start, end', () => {
      expect(transformDecl('margin-block', '8px 12px')).toEqual({
        marginTop: 8,
        marginBottom: 12,
      });
    });
  });

  describe('§4.4 padding-block / padding-inline shorthands', () => {
    it('padding-inline single value', () => {
      expect(transformDecl('padding-inline', '5%')).toEqual({
        paddingStart: '5%',
        paddingEnd: '5%',
      });
    });

    it('padding-inline two values', () => {
      expect(transformDecl('padding-inline', '5% 10%')).toEqual({
        paddingStart: '5%',
        paddingEnd: '10%',
      });
    });

    it('padding-block single value', () => {
      expect(transformDecl('padding-block', '4px')).toEqual({
        paddingTop: 4,
        paddingBottom: 4,
      });
    });

    it('padding-block two values', () => {
      expect(transformDecl('padding-block', '4px 8px')).toEqual({
        paddingTop: 4,
        paddingBottom: 8,
      });
    });
  });

  describe('§4.3 inset-block / inset-inline shorthands', () => {
    it('inset-inline single value', () => {
      expect(transformDecl('inset-inline', '0')).toEqual({
        insetInlineStart: 0,
        insetInlineEnd: 0,
      });
    });

    it('inset-inline two values: start, end', () => {
      expect(transformDecl('inset-inline', '0 auto')).toEqual({
        insetInlineStart: 0,
        insetInlineEnd: 'auto',
      });
    });

    it('inset-block single value', () => {
      expect(transformDecl('inset-block', '10px')).toEqual({
        insetBlockStart: 10,
        insetBlockEnd: 10,
      });
    });

    it('inset-block two values', () => {
      expect(transformDecl('inset-block', '10px 20px')).toEqual({
        insetBlockStart: 10,
        insetBlockEnd: 20,
      });
    });
  });

  describe('§4.3 inset four-value shorthand', () => {
    // Spec: `inset = <top>{1,4}`;same expansion rules as the
    // physical `margin` / `padding` shorthands:
    //   1: all four sides
    //   2: block (top/bottom), inline (left/right)
    //   3: top, inline, bottom
    //   4: top, right, bottom, left (clockwise)
    it('1 value: applies to all four sides', () => {
      expect(transformDecl('inset', '10px')).toEqual({
        top: 10,
        right: 10,
        bottom: 10,
        left: 10,
      });
    });

    it('2 values: block / inline', () => {
      expect(transformDecl('inset', '10px 20px')).toEqual({
        top: 10,
        right: 20,
        bottom: 10,
        left: 20,
      });
    });

    it('3 values: top, inline, bottom', () => {
      expect(transformDecl('inset', '10px 20px 30px')).toEqual({
        top: 10,
        right: 20,
        bottom: 30,
        left: 20,
      });
    });

    it('4 values: top, right, bottom, left (clockwise)', () => {
      expect(transformDecl('inset', '10px 20px 30px 40px')).toEqual({
        top: 10,
        right: 20,
        bottom: 30,
        left: 40,
      });
    });

    it('accepts auto in any slot', () => {
      expect(transformDecl('inset', 'auto 0')).toEqual({
        top: 'auto',
        right: 0,
        bottom: 'auto',
        left: 0,
      });
    });
  });

  describe('§4.2-§4.4 logical longhand passthrough', () => {
    // RN's Yoga (0.71+) accepts the logical longhand names directly;
    // the polyfill passes them through unchanged.
    it('margin-block-start / -end pass through', () => {
      expect(transformDecl('margin-block-start', '5px')).toEqual({ marginBlockStart: 5 });
      expect(transformDecl('margin-block-end', '5px')).toEqual({ marginBlockEnd: 5 });
    });

    it('margin-inline-start / -end pass through', () => {
      expect(transformDecl('margin-inline-start', '5px')).toEqual({ marginInlineStart: 5 });
      expect(transformDecl('margin-inline-end', '5px')).toEqual({ marginInlineEnd: 5 });
    });

    it('padding-block-start / -end pass through', () => {
      expect(transformDecl('padding-block-start', '5px')).toEqual({ paddingBlockStart: 5 });
      expect(transformDecl('padding-block-end', '5px')).toEqual({ paddingBlockEnd: 5 });
    });

    it('padding-inline-start / -end pass through', () => {
      expect(transformDecl('padding-inline-start', '5px')).toEqual({ paddingInlineStart: 5 });
      expect(transformDecl('padding-inline-end', '5px')).toEqual({ paddingInlineEnd: 5 });
    });

    it('inset-block-start / -end pass through', () => {
      expect(transformDecl('inset-block-start', '0')).toEqual({ insetBlockStart: 0 });
      expect(transformDecl('inset-block-end', '0')).toEqual({ insetBlockEnd: 0 });
    });

    it('inset-inline-start / -end pass through', () => {
      expect(transformDecl('inset-inline-start', '0')).toEqual({ insetInlineStart: 0 });
      expect(transformDecl('inset-inline-end', '0')).toEqual({ insetInlineEnd: 0 });
    });
  });

  describeOnRnWeb(() => {
    // Logical shorthands lower to RN style keys Yoga / rn-web both accept.
    // The browser-facing CSS layer is unchanged; parity keeps omni-bundle
    // widgets honest.
    it('margin-inline shorthand matches native expansion', () => {
      expect(transformDecl('margin-inline', '10px 20px')).toEqual({
        marginStart: 10,
        marginEnd: 20,
      });
    });
  });
});

describe('static math functions', () => {
  it('clamp with all static px arms', () => {
    expect(transformDecl('width', 'clamp(100px, 150px, 200px)')).toEqual({
      width: 150,
    });
    expect(transformDecl('width', 'clamp(100px, 300px, 200px)')).toEqual({
      width: 200, // clamped to max
    });
  });

  it('min / max with px arms', () => {
    expect(transformDecl('width', 'min(100px, 200px)')).toEqual({ width: 100 });
    expect(transformDecl('width', 'max(100px, 200px)')).toEqual({ width: 200 });
  });

  it('calc with addition / subtraction', () => {
    expect(transformDecl('width', 'calc(100px + 20px)')).toEqual({ width: 120 });
    expect(transformDecl('width', 'calc(100px - 20px)')).toEqual({ width: 80 });
  });

  it('calc with multiplication / division', () => {
    expect(transformDecl('width', 'calc(10px * 4)')).toEqual({ width: 40 });
    expect(transformDecl('width', 'calc(100px / 4)')).toEqual({ width: 25 });
  });

  it('calc with operator precedence', () => {
    expect(transformDecl('width', 'calc(10px + 4px * 2)')).toEqual({ width: 18 });
  });

  it('clamp with all percent arms', () => {
    expect(transformDecl('width', 'clamp(20%, 50%, 80%)')).toEqual({ width: '50%' });
  });

  it('min / max with mixed percent + number fallback', () => {
    expect(transformDecl('opacity', 'min(0.5, 0.75)')).toEqual({ opacity: 0.5 });
  });

  it('defers when any arm is a viewport unit', () => {
    // vw is runtime-polyfillable, not static;transformDecl should
    // NOT return a resolved number. Falls through to string
    // coercion (render-time polyfill runner in task #5 will
    // finish the job).
    const out = transformDecl('width', 'clamp(100px, 50vw, 300px)');
    expect(typeof out.width).toBe('string');
    expect(out.width).toContain('clamp(');
  });

  // CSS Syntax 3 §4.3.10: function names match ASCII case-insensitively.
  // The fold must apply regardless of how the author types the name.
  it.each([
    ['CALC(100px + 20px)', { width: 120 }],
    ['cAlc(100px + 20px)', { width: 120 }],
    ['Clamp(100px, 150px, 200px)', { width: 150 }],
    ['MIN(100px, 200px)', { width: 100 }],
    ['Pow(2, 8)', { width: 256 }],
  ])('case-insensitively folds %s', (input, expected) => {
    expect(transformDecl('width', input)).toEqual(expected);
  });

  it('case-insensitive math inside modern color channels', () => {
    // Same case-insensitivity applies inside oklch / oklab / lch / lab
    // channels: a mixed-case calc() must fold so the color polyfill can
    // read the literal channel value.
    const out = transformDecl('color', 'OKLCH(0.7 0.15 CALC(45deg * 2))');
    expect(out.color).toMatch(/^#[0-9a-f]{6,8}$/i);
  });

  describeOnRnWeb(() => {
    // The browser parses `calc()`, `min()`, `max()`, `clamp()`, and the
    // Math L4 functions natively. rn-web's `normalizeValueWithProperty`
    // passes string values through unchanged so the raw CSS expression
    // reaches the engine intact. Folding at transform time would only
    // duplicate work and discard `var()` / dynamic operand recovery the
    // browser handles for free.

    it('passes calc() through as a string instead of folding', () => {
      expect(transformDecl('width', 'calc(100px + 20px)')).toEqual({
        width: 'calc(100px + 20px)',
      });
    });

    it('passes min / max / clamp through as strings', () => {
      expect(transformDecl('width', 'min(100px, 200px)')).toEqual({ width: 'min(100px, 200px)' });
      expect(transformDecl('width', 'max(100px, 200px)')).toEqual({ width: 'max(100px, 200px)' });
      expect(transformDecl('width', 'clamp(100px, 150px, 200px)')).toEqual({
        width: 'clamp(100px, 150px, 200px)',
      });
    });

    it('passes Math L4 trig / exp / sign through as strings', () => {
      expect(transformDecl('width', 'calc(sin(90deg) * 100px)')).toEqual({
        width: 'calc(sin(90deg) * 100px)',
      });
      expect(transformDecl('width', 'pow(2, 8)')).toEqual({ width: 'pow(2, 8)' });
    });
  });
});

// https://drafts.csswg.org/css-values-4/#math-function
describe('Math L4 spec compliance (CSS Values 4 §10.3-§10.6)', () => {
  // §10.3 Stepped-value functions: round(<strategy>?, A, B?), mod(A,B), rem(A,B).

  describe('§10.3 round()', () => {
    // "If the type of A matches <number>, then B may be omitted, and
    // defaults to 1; otherwise, omitting B is a syntax error."
    it('B defaults to 1 when A is a <number> and B is omitted', () => {
      // Number A → unitless output; B implicit 1.
      expect(transformDecl('opacity', 'round(0.73)')).toEqual({ opacity: 1 });
      expect(transformDecl('opacity', 'round(0.49)')).toEqual({ opacity: 0 });
    });

    // "nearest (default)"
    it('default strategy is nearest', () => {
      expect(transformDecl('width', 'round(10.49px, 1px)')).toEqual({ width: 10 });
      expect(transformDecl('width', 'round(10.5px, 1px)')).toEqual({ width: 11 });
    });

    it('rounds with explicit nearest', () => {
      expect(transformDecl('width', 'round(nearest, 10.4px, 1px)')).toEqual({ width: 10 });
    });

    it('rounds up regardless of magnitude with strategy `up`', () => {
      expect(transformDecl('width', 'round(up, 10.1px, 1px)')).toEqual({ width: 11 });
      expect(transformDecl('width', 'round(up, -10.9px, 1px)')).toEqual({ width: -10 });
    });

    it('rounds down regardless of magnitude with strategy `down`', () => {
      expect(transformDecl('width', 'round(down, 10.9px, 1px)')).toEqual({ width: 10 });
      expect(transformDecl('width', 'round(down, -10.1px, 1px)')).toEqual({ width: -11 });
    });

    it('rounds toward zero with strategy `to-zero`', () => {
      expect(transformDecl('width', 'round(to-zero, 10.9px, 1px)')).toEqual({ width: 10 });
      expect(transformDecl('width', 'round(to-zero, -10.9px, 1px)')).toEqual({ width: -10 });
    });

    it('defers (string passthrough) on unknown strategy keyword', () => {
      const out = transformDecl('width', 'round(banana, 10px, 1px)');
      expect(typeof out.width).toBe('string');
      expect(out.width).toContain('round(');
    });

    it('defers (string passthrough) on mismatched units', () => {
      const out = transformDecl('width', 'round(10px, 1deg)');
      expect(typeof out.width).toBe('string');
    });

    // "otherwise, omitting B is a syntax error."
    it('defers (string passthrough) when A is a <length> and B is omitted', () => {
      const out = transformDecl('width', 'round(7.3px)');
      expect(typeof out.width).toBe('string');
      expect(out.width).toContain('round(');
    });

    // "All math functions perform type checking on their arguments." A
    // number A combined with a typed B yields a type mismatch.
    it('defers (string passthrough) when A is a <number> and B is a <length>', () => {
      const out = transformDecl('width', 'round(7, 1px)');
      expect(typeof out.width).toBe('string');
    });

    it('defers (string passthrough) when A is a <length> and B is a <number>', () => {
      const out = transformDecl('width', 'round(7px, 1)');
      expect(typeof out.width).toBe('string');
    });

    // Section 10.3 strategy keyword for `line-width`: A is "snapped as a
    // line width" using the device pixel ratio. The no-B form is
    // polyfilled via a runtime resolver that reads
    // env.media.pixelRatio. The with-B form (round-to-nearest then snap)
    // is not implemented; it falls through to string passthrough so the
    // value is observable as authored, without a misleading dev warn.
    it('round(line-width, A): no warn, emits a value buildResolver can fold (snap-as-line-width)', () => {
      resetWarningsForTest();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        const out = transformDecl('width', 'round(line-width, 1.5px)');
        // Value reaches buildResolver verbatim so the cascade-aware
        // resolver can snap A at render time using env.media.pixelRatio.
        expect(out.width).toBe('round(line-width, 1.5px)');
        expect(warnSpy).not.toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('round(line-width, A, B): with-B form is not implemented; falls through as string', () => {
      const out = transformDecl('width', 'round(line-width, 1.5px, 1px)');
      expect(typeof out.width).toBe('string');
      expect(out.width).toContain('round(');
    });
  });

  describe('§10.3 mod()', () => {
    // "mod(A, B) ... result has the sign of B"
    it('returns a result with the sign of B (math mod)', () => {
      expect(transformDecl('width', 'mod(7px, 3px)')).toEqual({ width: 1 });
      // -7 mod 3 = 2 (sign of B)
      expect(transformDecl('width', 'mod(-7px, 3px)')).toEqual({ width: 2 });
      // 7 mod -3 = -2 (sign of B)
      expect(transformDecl('width', 'mod(7px, -3px)')).toEqual({ width: -2 });
    });

    it('defers (string passthrough) when B is zero', () => {
      const out = transformDecl('width', 'mod(7px, 0px)');
      expect(typeof out.width).toBe('string');
      expect(out.width).toContain('mod(');
    });
  });

  describe('§10.3 rem()', () => {
    // "rem(A, B) ... result has the sign of A"
    it('returns a result with the sign of A (JS remainder)', () => {
      expect(transformDecl('width', 'rem(7px, 3px)')).toEqual({ width: 1 });
      // -7 rem 3 = -1 (sign of A)
      expect(transformDecl('width', 'rem(-7px, 3px)')).toEqual({ width: -1 });
      // 7 rem -3 = 1 (sign of A)
      expect(transformDecl('width', 'rem(7px, -3px)')).toEqual({ width: 1 });
    });

    it('defers (string passthrough) when B is zero', () => {
      const out = transformDecl('width', 'rem(7px, 0px)');
      expect(typeof out.width).toBe('string');
      expect(out.width).toContain('rem(');
    });
  });

  // §10.4 Trigonometric functions.

  describe('§10.4 sin / cos / tan', () => {
    // "accept angles or unitless numbers": numbers treated as radians.
    it('sin accepts an angle', () => {
      const out = transformDecl('width', 'calc(sin(90deg) * 100px)');
      expect(Math.abs(out.width - 100)).toBeLessThan(1e-9);
    });

    it('sin accepts a unitless number as radians', () => {
      const out = transformDecl('width', 'calc(sin(0) * 100px)');
      expect(out.width).toBe(0);
    });

    it('cos(0) is 1', () => {
      const out = transformDecl('width', 'calc(cos(0deg) * 100px)');
      expect(Math.abs(out.width - 100)).toBeLessThan(1e-9);
    });

    it('tan(45deg) is 1', () => {
      const out = transformDecl('width', 'calc(tan(45deg) * 100px)');
      expect(Math.abs(out.width - 100)).toBeLessThan(1e-9);
    });
  });

  // The inverse trig + atan2 functions return `<angle>` (degrees). RN's
  // host-side properties only accept literal angle tokens; the math
  // pipeline can fold them into composed `calc()` expressions but not
  // into bare angle slots (`rotate(asin(1))` etc. would require the
  // standalone-transform polyfill to accept inner math first). Test the
  // angle return path by calling `resolveStaticMathFunction` directly.
  describe('§10.4 asin / acos / atan / atan2', () => {
    function mathOf(src: string) {
      const fn = tokenize(src)[0];
      return resolveStaticMathFunction(fn);
    }

    // "asin / acos / atan: returns <angle> in degrees"
    it('asin returns degrees', () => {
      const r = mathOf('asin(1)')!;
      expect(r.unit).toBe('deg');
      expect(r.value).toBeCloseTo(90, 6);
    });

    it('asin rejects when argument is outside [-1, 1]', () => {
      expect(mathOf('asin(2)')).toBeNull();
    });

    it('acos returns degrees', () => {
      const r = mathOf('acos(0)')!;
      expect(r.unit).toBe('deg');
      expect(r.value).toBeCloseTo(90, 6);
    });

    it('acos rejects when argument is outside [-1, 1]', () => {
      expect(mathOf('acos(-2)')).toBeNull();
    });

    it('atan returns degrees', () => {
      const r = mathOf('atan(1)')!;
      expect(r.unit).toBe('deg');
      expect(r.value).toBeCloseTo(45, 6);
    });

    // "atan2(y, x) calculates the arctangent of y/x"
    it('atan2 takes (y, x) and returns degrees', () => {
      const r = mathOf('atan2(1, 0)')!;
      expect(r.unit).toBe('deg');
      expect(r.value).toBeCloseTo(90, 6);
    });

    it('atan2 rejects when args disagree on unit', () => {
      expect(mathOf('atan2(1px, 1)')).toBeNull();
    });
  });

  // §10.5 Exponential functions.

  describe('§10.5 pow / sqrt / hypot / log / exp', () => {
    it('pow(base, exp) returns base^exp', () => {
      expect(transformDecl('width', 'calc(pow(2, 8) * 1px)')).toEqual({ width: 256 });
    });

    // "Negative or zero values in arguments that don't support them result in NaN"
    it('pow defers (string passthrough) on negative base with non-integer exponent', () => {
      const out = transformDecl('width', 'calc(pow(-2, 0.5) * 1px)');
      expect(typeof out.width).toBe('string');
    });

    it('sqrt(A) returns √A', () => {
      expect(transformDecl('width', 'calc(sqrt(81) * 1px)')).toEqual({ width: 9 });
    });

    it('sqrt defers (string passthrough) on negative argument', () => {
      const out = transformDecl('width', 'calc(sqrt(-4) * 1px)');
      expect(typeof out.width).toBe('string');
    });

    it('hypot preserves unit', () => {
      // hypot(3,4) = 5; with px arms result is 5px.
      expect(transformDecl('width', 'hypot(3px, 4px)')).toEqual({ width: 5 });
    });

    it('hypot defers (string passthrough) when arms disagree on unit', () => {
      const out = transformDecl('width', 'hypot(3px, 4deg)');
      expect(typeof out.width).toBe('string');
    });

    it('log defaults to natural log', () => {
      const out = transformDecl('width', 'calc(log(2.718281828) * 100px)');
      expect(Math.abs(out.width - 100)).toBeLessThan(0.5);
    });

    it('log accepts an explicit base', () => {
      // log(8, 2) = 3
      expect(transformDecl('width', 'calc(log(8, 2) * 1px)')).toEqual({ width: 3 });
    });

    it('log defers (string passthrough) on non-positive argument', () => {
      const zero = transformDecl('width', 'calc(log(0) * 1px)');
      expect(typeof zero.width).toBe('string');
      const neg = transformDecl('width', 'calc(log(-1) * 1px)');
      expect(typeof neg.width).toBe('string');
    });

    it('exp returns e^A', () => {
      const out = transformDecl('width', 'calc(exp(1) * 100px)');
      expect(Math.abs(out.width - 271.828)).toBeLessThan(0.1);
    });
  });

  // §10.6 Sign-related functions.

  describe('§10.6 abs / sign', () => {
    // "abs(x) ... Returns the absolute value. Units are preserved."
    it('abs preserves units', () => {
      expect(transformDecl('width', 'abs(-12px)')).toEqual({ width: 12 });
      expect(transformDecl('width', 'abs(12px)')).toEqual({ width: 12 });
    });

    // "sign(x) ... Returns +1, -1, or 0 with the sign of the argument."
    it('sign returns +1 for positive', () => {
      expect(transformDecl('opacity', 'sign(5)')).toEqual({ opacity: 1 });
    });

    it('sign returns -1 for negative', () => {
      expect(transformDecl('opacity', 'sign(-5)')).toEqual({ opacity: -1 });
    });

    it('sign returns 0 for zero', () => {
      expect(transformDecl('opacity', 'sign(0)')).toEqual({ opacity: 0 });
    });

    it('sign strips unit (result is a number even when input had a length)', () => {
      expect(transformDecl('opacity', 'sign(5px)')).toEqual({ opacity: 1 });
    });
  });

  // §10.9 Type checking.

  describe('§10.9 type checking', () => {
    // "All math functions perform type checking on their arguments before
    //  evaluation. An argument with incompatible units produces an invalid expression."
    it('defers (string passthrough) on mixed length + angle in stepped-value', () => {
      const out = transformDecl('width', 'mod(10px, 4deg)');
      expect(typeof out.width).toBe('string');
    });

    it('defers (string passthrough) on mixed length + angle in hypot', () => {
      const out = transformDecl('width', 'hypot(3px, 4deg)');
      expect(typeof out.width).toBe('string');
    });
  });

  // Edge-case coverage for §10.4 / §10.5 corners. Each test quotes the
  // relevant spec text in a leading comment.
  describe('§10.4 / §10.5 edge cases', () => {
    function mathOf(src: string) {
      const fn = tokenize(src)[0];
      return resolveStaticMathFunction(fn);
    }

    // §10.4: "atan2(A, B) ... is equivalent to atan(A / B), except that
    // it handles the case where A and B have value 0 and where B is 0
    // gracefully." Both zero → 0.
    it('atan2(0, 0) is 0deg', () => {
      const r = mathOf('atan2(0, 0)')!;
      expect(r.unit).toBe('deg');
      expect(r.value).toBeCloseTo(0, 6);
    });

    // §10.4: y=0, x=1 lies on the positive x-axis → 0deg.
    it('atan2(0, 1) is 0deg', () => {
      const r = mathOf('atan2(0, 1)')!;
      expect(r.unit).toBe('deg');
      expect(r.value).toBeCloseTo(0, 6);
    });

    // §10.4: y=1, x=0 lies on the positive y-axis → 90deg.
    it('atan2(1, 0) is 90deg', () => {
      const r = mathOf('atan2(1, 0)')!;
      expect(r.unit).toBe('deg');
      expect(r.value).toBeCloseTo(90, 6);
    });

    // §10.5: "hypot(A, ...) ... returns the square root of the sum of
    // squares of its arguments." A single argument therefore returns
    // |A| with the unit preserved.
    it('hypot(5px) single-arg returns 5px', () => {
      expect(transformDecl('width', 'hypot(5px)')).toEqual({ width: 5 });
    });

    // §10.5: Pythagorean triple.
    it('hypot(3px, 4px) is 5px', () => {
      expect(transformDecl('width', 'hypot(3px, 4px)')).toEqual({ width: 5 });
    });

    // §10.5 + IEEE 754: pow(0, 0) is defined as 1 per the math
    // definition the spec inherits via ECMAScript (Math.pow(0, 0) === 1).
    it('pow(0, 0) is 1', () => {
      expect(transformDecl('opacity', 'pow(0, 0)')).toEqual({ opacity: 1 });
    });

    // §10.5: "Negative or zero values in arguments that don't support
    // them result in NaN." pow(-1, 0.5) is √(-1); NaN → defer.
    it('pow(-1, 0.5) defers (NaN bails the static fold)', () => {
      expect(mathOf('pow(-1, 0.5)')).toBeNull();
    });

    // §10.5: sqrt of a negative is NaN; the static fold bails.
    it('sqrt(-1) defers (NaN bails the static fold)', () => {
      expect(mathOf('sqrt(-1)')).toBeNull();
    });

    // §10.5: sqrt(0) is 0 exactly.
    it('sqrt(0) is 0', () => {
      const r = mathOf('sqrt(0)')!;
      expect(r.value).toBe(0);
      expect(r.unit).toBe('');
    });
  });

  // Syntax 3 §4.3.10: CSS function names are ASCII case-insensitive.
  // The polyfill gate (mightBeMathFn) runs on the raw value text before
  // tokenization, so uppercase forms must reach the fold identically
  // to lowercase forms.
  describe('§4.3.10 ASCII case-insensitive function names', () => {
    it('uppercase math fn names fold identically to lowercase', () => {
      expect(transformDecl('width', 'SIN(45deg)')).toEqual(transformDecl('width', 'sin(45deg)'));
      expect(transformDecl('width', 'CALC(10px + 5px)')).toEqual(
        transformDecl('width', 'calc(10px + 5px)')
      );
      expect(transformDecl('width', 'HYPOT(3px, 4px)')).toEqual(
        transformDecl('width', 'hypot(3px, 4px)')
      );
    });
  });

  describeOnRnWeb(() => {
    // `transformDecl` skips the static math fold when `__NATIVE_WEB__` is
    // true (`index.ts`): strings reach the RN-web CSS serializer intact.

    it('skips static trig fold; authored calc reaches CSS as text', () => {
      expect(transformDecl('width', 'calc(sin(90deg) * 100px)')).toEqual({
        width: 'calc(sin(90deg) * 100px)',
      });
    });

    it('does not statically evaluate stepped-value functions on web', () => {
      expect(transformDecl('opacity', 'round(0.73)')).toEqual({ opacity: 'round(0.73)' });
      expect(transformDecl('width', 'mod(7px, 3px)')).toEqual({ width: 'mod(7px, 3px)' });
    });
  });
});

describe('static color math', () => {
  // Folding <color> function forms consumed by transforms. CSS Color Modules 4 and 5:
  // https://drafts.csswg.org/css-color-4/
  // https://drafts.csswg.org/css-color-5/

  it('oklch(0.628 0.2577 29.23) folds to near-pure-red hex', () => {
    const tok = tokenize('oklch(0.628 0.2577 29.23)')[0];
    const hex = staticColorFunctionToHex(tok);
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    expect(hex!.slice(1, 3)).toMatch(/^f[0-9a-f]$/);
  });

  it('oklch slash alpha emits 8-digit hex', () => {
    const tok = tokenize('oklch(0.5 0.2 200 / 0.5)')[0];
    const hex = staticColorFunctionToHex(tok);
    expect(hex).toMatch(/^#[0-9a-f]{8}$/);
  });

  it('color-mix(in srgb) 50/50 red and blue is #800080 in display RGB', () => {
    const tok = tokenize('color-mix(in srgb, #ff0000 50%, #0000ff 50%)')[0];
    const hex = staticColorFunctionToHex(tok);
    // `in srgb`: mix in gamma-encoded channel space (CSS Color 5 §3).
    expect(hex).toBe('#800080');
  });

  it('color-mix omits percentages → implicit 50/50 in srgb', () => {
    const tok = tokenize('color-mix(in srgb, #ff0000, #0000ff)')[0];
    const hex = staticColorFunctionToHex(tok);
    expect(hex).toBe('#800080');
  });

  it('color-mix(in srgb) 25/75 red blue yields valid hex', () => {
    const tok = tokenize('color-mix(in srgb, #ff0000 25%, #0000ff 75%)')[0];
    const hex = staticColorFunctionToHex(tok);
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('color-mix(in oklch) red blue differs from srgb midpoint #800080', () => {
    const tok = tokenize('color-mix(in oklch, red, blue)')[0];
    const hex = staticColorFunctionToHex(tok);
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    // Polar OKLCh mix != display-sRGB midpoint #800080.
    expect(hex).not.toBe('#800080');
  });

  it('color-mix when mix weights sum below 100 multiplies alpha (30%+20% → 0.5 opacity byte 80)', () => {
    const tok = tokenize('color-mix(in oklch, red 30%, blue 20%)')[0];
    const hex = staticColorFunctionToHex(tok);
    // CSS Color 5 §3 leftovers: summed weights 50 → alpha multiplied by leftover ratio; byte 80 ~= 128/255.
    expect(hex).toMatch(/^#[0-9a-f]{6}80$/);
  });

  it('lab(50% 0 0) maps L onto 0..100 so mid lightness is perceptual gray not black', () => {
    const tok = tokenize('lab(50% 0 0)')[0];
    const hex = staticColorFunctionToHex(tok);
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    const r = parseInt(hex!.slice(1, 3), 16);
    // LAB L resolves as CIEXYZ-scaled lightness 0-100 (% maps to Lab L axis), unlike oklab's 0-1 ramp.
    expect(r).toBeGreaterThan(0x60);
    expect(r).toBeLessThan(0xa0);
  });

  it('lab(50 0 0) number channels match lab(50% 0 0) percent channels', () => {
    const numTok = tokenize('lab(50 0 0)')[0];
    const pctTok = tokenize('lab(50% 0 0)')[0];
    expect(staticColorFunctionToHex(numTok)).toBe(staticColorFunctionToHex(pctTok));
  });

  it('lch(50% 0 0) achromatic midpoint stays in mid RGB band', () => {
    const tok = tokenize('lch(50% 0 0)')[0];
    const hex = staticColorFunctionToHex(tok);
    const r = parseInt(hex!.slice(1, 3), 16);
    expect(r).toBeGreaterThan(0x60);
    expect(r).toBeLessThan(0xa0);
  });

  it('oklab(50% 0 0) maps lightness to 0..1 so midpoint sits near mid-gray', () => {
    const tok = tokenize('oklab(50% 0 0)')[0];
    const hex = staticColorFunctionToHex(tok);
    const r = parseInt(hex!.slice(1, 3), 16);
    expect(r).toBeGreaterThan(0x50);
    expect(r).toBeLessThan(0xa0);
  });

  it('lab(50% 100% 0) max positive a-percent drives red dominance over green and blue', () => {
    const tok = tokenize('lab(50% 100% 0)')[0];
    const hex = staticColorFunctionToHex(tok);
    // a/b percentage resolves against the Lab a/b +/-125 axis (CSS Color 4 §9 lab()).
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    const r = parseInt(hex!.slice(1, 3), 16);
    const g = parseInt(hex!.slice(3, 5), 16);
    const b = parseInt(hex!.slice(5, 7), 16);
    expect(r).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(b);
  });

  it('transformDecl(backgroundColor color-mix srgb red blue) → #800080', () => {
    const out = transformDecl('backgroundColor', 'color-mix(in srgb, red, blue)');
    expect(out.backgroundColor).toBe('#800080');
  });

  it('transformDecl leaves color-mix(in srgb, var(--a), …) unresolved as string color', () => {
    const out = transformDecl('color', 'color-mix(in srgb, var(--a), blue)');
    expect(typeof out.color).toBe('string');
    expect(out.color).toContain('var');
  });

  describeOnRnWeb(() => {
    // rn-web: `@react-native/normalize-colors` only parses classical hex/rgb/hsl/hwb;
    // modern color functions flatten to transparent unless we emit hex beforehand.
    it('rn-web folds color-mix to hex because normalize-color drops unknown functions', () => {
      const out = transformDecl('backgroundColor', 'color-mix(in srgb, red, blue)');
      expect(out.backgroundColor).toMatch(/^#[0-9a-f]{6,8}$/i);
    });

    it('rn-web folds oklch oklab lch lab to hex', () => {
      expect(transformDecl('color', 'oklch(0.7 0.15 200)').color).toMatch(/^#[0-9a-f]{6,8}$/i);
      expect(transformDecl('color', 'oklab(0.5 0 0)').color).toMatch(/^#[0-9a-f]{6,8}$/i);
      expect(transformDecl('color', 'lch(50% 30 200)').color).toMatch(/^#[0-9a-f]{6,8}$/i);
      expect(transformDecl('color', 'lab(50% 20 -10)').color).toMatch(/^#[0-9a-f]{6,8}$/i);
    });

    // Bypass normalizeColor via `var(--sc-…)` plus `colorScheme: 'light dark'` so UA resolves branches.
    it('light-dark on background-color uses hyphenated --sc-ld-* var + colorScheme light dark', () => {
      expect(transformDecl('background-color', 'light-dark(#fafafa, #1a1a1a)')).toEqual({
        backgroundColor: 'var(--sc-ld-background-color)',
        '--sc-ld-background-color': 'light-dark(#fafafa, #1a1a1a)',
        colorScheme: 'light dark',
      });
    });

    it('light-dark on color emits matching --sc-ld-color reference', () => {
      expect(transformDecl('color', 'light-dark(#0e0e10, #f5f3ee)')).toEqual({
        color: 'var(--sc-ld-color)',
        '--sc-ld-color': 'light-dark(#0e0e10, #f5f3ee)',
        colorScheme: 'light dark',
      });
    });

    it('light-dark border-color hyphenates custom property key to match hyphenateStyleName', () => {
      expect(transformDecl('border-color', 'light-dark(#000, #fff)')).toEqual({
        borderColor: 'var(--sc-ld-border-color)',
        '--sc-ld-border-color': 'light-dark(#000, #fff)',
        colorScheme: 'light dark',
      });
    });
  });
});

describe('rgb hsl hwb fold path (CSS Color 4 §6 / §7 / §8, §4.4 none, Syntax)', () => {
  // §6 rgb(), §7 hsl(), §8 hwb(); legacy commas and slash alpha are valid. §4.5 `none` used value 0
  // for computations. Inline /* */ comments: CSS Syntax 3 §4. `transformDecl` usually leaves
  // rgb()/hsl()/hwb() to RN `normalizeColor`; this fold feeds color-mix operands and unit tests only.

  function fold(value: string): string | null {
    const toks = tokenize(value);
    if (toks.length !== 1 || toks[0].kind !== TokenKind.Function) return null;
    return staticColorFunctionToHex(toks[0]);
  }

  describe('legacy comma-separated alpha (§6 compatibility)', () => {
    it('rgba(R, G, B, A) accepts comma-separated alpha', () => {
      expect(fold('rgba(255, 0, 0, 0.5)')).toBe('#ff000080');
    });

    it('rgb(R, G, B, A) accepts comma-separated alpha (modern alias)', () => {
      expect(fold('rgb(255, 0, 0, 0.5)')).toBe('#ff000080');
    });
  });

  describe('hsl hsla (§7 legacy comma)', () => {
    it('hsla(H, S, L, A) accepts comma-separated alpha', () => {
      expect(fold('hsla(120, 100%, 50%, 0.5)')).toBe('#00ff0080');
    });

    it('hsl(H, S, L, A) accepts comma-separated alpha (modern alias)', () => {
      expect(fold('hsl(120, 100%, 50%, 0.5)')).toBe('#00ff0080');
    });
  });

  describe('§4.4 none channel resolves to zero in fold', () => {
    it('rgb(none none none) → black opaque', () => {
      expect(fold('rgb(none none none)')).toBe('#000000');
    });

    it('rgb(none none none / none) → black, alpha 0', () => {
      expect(fold('rgb(none none none / none)')).toBe('#00000000');
    });

    it('hsl(none none none) → black opaque', () => {
      expect(fold('hsl(none none none)')).toBe('#000000');
    });

    it('hwb(none none none) → fully saturated red (hue 0, w=0, b=0)', () => {
      expect(fold('hwb(none none none)')).toBe('#ff0000');
    });
  });

  describe('comments inside arguments (Syntax 3 §4)', () => {
    it('rgb(/* R */0, /* G */51, /* B */255) parses comment-stripped', () => {
      expect(fold('rgb(/* R */0, /* G */51, /* B */255)')).toBe('#0033ff');
    });

    it('comments inside oklch() / lch() / lab() pass through too', () => {
      expect(fold('oklch(/* L */ 0.7 0.15 200)')).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('color-mix integration (operands via static readers)', () => {
    // `transformDecl` hits `mightBeModernColor` so legacy / `none` operands reach this fold path.
    it('color-mix accepts legacy 4-arg rgba operand', () => {
      const out = transformDecl(
        'backgroundColor',
        'color-mix(in srgb, rgba(255, 0, 0, 0.5), blue)'
      );
      expect(out.backgroundColor).toMatch(/^#[0-9a-f]{6,8}$/);
    });

    it('color-mix accepts hsla legacy 4-arg operand', () => {
      const out = transformDecl(
        'backgroundColor',
        'color-mix(in srgb, hsla(120, 100%, 50%, 0.5), white)'
      );
      expect(out.backgroundColor).toMatch(/^#[0-9a-f]{6,8}$/);
    });

    it('color-mix accepts `none` channel operand (carry-forward)', () => {
      const out = transformDecl('backgroundColor', 'color-mix(in srgb, rgb(255 none none), blue)');
      expect(out.backgroundColor).toMatch(/^#[0-9a-f]{6,8}$/);
    });
  });

  describeOnRnWeb(() => {
    it('legacy rgba static fold parity (color-mix operand reader)', () => {
      expect(fold('rgba(255, 0, 0, 0.5)')).toBe('#ff000080');
    });

    it('transformDecl folds color-mix with legacy rgba operands', () => {
      const out = transformDecl(
        'backgroundColor',
        'color-mix(in srgb, rgba(255, 0, 0, 0.5), blue)'
      );
      expect(out.backgroundColor).toMatch(/^#[0-9a-f]{6,8}$/);
    });
  });
});

describe('color() spec compliance: predefined spaces (CSS Color Module Level 4 §10)', () => {
  // https://drafts.csswg.org/css-color-4/#color-function
  // `color(colorspace channel{3}[ / alpha])`; rectangular keywords §10; XYZ §10 / Appendix B whites.
  // Static fold targets sRGB hex; wider gamuts map through OKLCh bisection (§14 linkage in colorMath).

  function fold(value: string): string | null {
    const toks = tokenize(value);
    if (toks.length !== 1 || toks[0].kind !== TokenKind.Function) return null;
    return staticColorFunctionToHex(toks[0]);
  }

  describe('percent channels match numbers (§10 rectangular spaces)', () => {
    // 100% on RGB-like spaces maps like 1.0; XYZ percentages share D65/D50 whites.
    it('color(srgb 100% 50% 20%) ≡ color(srgb 1 0.5 0.2)', () => {
      expect(fold('color(srgb 100% 50% 20%)')).toBe(fold('color(srgb 1 0.5 0.2)'));
    });

    it('color(display-p3 100% 50% 20%) ≡ color(display-p3 1 0.5 0.2)', () => {
      expect(fold('color(display-p3 100% 50% 20%)')).toBe(fold('color(display-p3 1 0.5 0.2)'));
    });

    it('color(xyz 50% 50% 50%) ≡ color(xyz 0.5 0.5 0.5)', () => {
      expect(fold('color(xyz 50% 50% 50%)')).toBe(fold('color(xyz 0.5 0.5 0.5)'));
    });
  });

  describe('none collapses to zero in color() (§4.4)', () => {
    it('color(srgb none none none) → black opaque', () => {
      expect(fold('color(srgb none none none)')).toBe('#000000');
    });

    it('color(srgb none none none / none) → black, alpha 0', () => {
      expect(fold('color(srgb none none none / none)')).toBe('#00000000');
    });

    it('display-p3 with none on b/g channels still emits hex (p3 red gamut-mapped)', () => {
      // Equivalent to display-p3 1 0 0; chroma-heavy P3 corners map toward sRGB red.
      expect(fold('color(display-p3 1 none none)')).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('slash alpha', () => {
    it('alpha defaults to 1 when omitted', () => {
      expect(fold('color(srgb 1 0 0)')).toBe('#ff0000');
    });

    it('alpha accepts numbers (0..1)', () => {
      expect(fold('color(srgb 1 0 0 / 0.5)')).toBe('#ff000080');
    });

    it('alpha accepts percentages (0..100)', () => {
      expect(fold('color(srgb 1 0 0 / 50%)')).toBe('#ff000080');
    });
  });

  describe('rgb-like predefined keywords → hex', () => {
    it('srgb 1 0 0 → red', () => {
      expect(fold('color(srgb 1 0 0)')).toBe('#ff0000');
    });

    it('srgb-linear 1 0 0 gamma-encodes to display sRGB red', () => {
      expect(fold('color(srgb-linear 1 0 0)')).toBe('#ff0000');
    });

    it('srgb-linear mid gray has equal r g b channels', () => {
      const hex = fold('color(srgb-linear 0.5 0.5 0.5)');
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      expect(hex!.slice(1, 3)).toBe(hex!.slice(3, 5));
      expect(hex!.slice(3, 5)).toBe(hex!.slice(5, 7));
    });

    it('display-p3 corner maps to hex without throw', () => {
      expect(fold('color(display-p3 1 0 0)')).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('a98-rgb / prophoto-rgb / rec2020 fold without throwing', () => {
      expect(fold('color(a98-rgb 0.5 0.5 0.5)')).toMatch(/^#[0-9a-f]{6}$/);
      expect(fold('color(prophoto-rgb 0.5 0.5 0.5)')).toMatch(/^#[0-9a-f]{6}$/);
      expect(fold('color(rec2020 0.5 0.5 0.5)')).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('xyz-d50 vs xyz-d65', () => {
    it('xyz / xyz-d65 are aliases', () => {
      expect(fold('color(xyz 0.5 0.5 0.5)')).toBe(fold('color(xyz-d65 0.5 0.5 0.5)'));
    });

    it('near-white XYZ tristimulus values diverge across D50 and D65 white points', () => {
      const d50 = fold('color(xyz-d50 0.9642 1.0 0.8249)');
      const d65 = fold('color(xyz-d65 0.9504 1.0 1.0888)');
      expect(d50).toMatch(/^#[0-9a-f]{6}$/);
      expect(d65).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('invalid input bails to null', () => {
    it('unknown colorspace identifier returns null', () => {
      expect(fold('color(unknown-space 1 0 0)')).toBeNull();
    });

    it('missing colorspace identifier returns null', () => {
      expect(fold('color(1 0 0)')).toBeNull();
    });

    it('comma-separated channels return null (color() grammar requires whitespace)', () => {
      expect(fold('color(srgb 1, 0, 0)')).toBeNull();
    });

    it('fewer than 3 channels returns null', () => {
      expect(fold('color(srgb 1 0)')).toBeNull();
    });
  });

  describe('transformDecl color() warns on unknown interpolation space operands', () => {
    let warnSpy: jest.SpyInstance;
    beforeEach(() => {
      resetWarningsForTest();
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('color(srgb 1 0 0) folds via transformDecl', () => {
      expect(transformDecl('backgroundColor', 'color(srgb 1 0 0)')).toEqual({
        backgroundColor: '#ff0000',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('color(display-p3 1 0 0) folds via transformDecl', () => {
      const out = transformDecl('backgroundColor', 'color(display-p3 1 0 0)');
      expect(out.backgroundColor).toMatch(/^#[0-9a-f]{6}$/);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('color(unknown-space …) emits a warnOnce naming the value + property', () => {
      transformDecl('color', 'color(unknown-space 1 0 0)');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      const msg = warnSpy.mock.calls[0][0] as string;
      expect(msg).toContain('color(unknown-space 1 0 0)');
      expect(msg).toContain('"color"');
      expect(msg).toContain('modern color form');
    });

    it('warnOnce lists okhsv mix (unsupported interpolation-space ident)', () => {
      transformDecl('backgroundColor', 'color-mix(in okhsv, red, blue)');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toContain('color-mix(in okhsv, red, blue)');
    });

    it('literal-base oklch(from red l c h) folds to saturated red hex', () => {
      const out = transformDecl('color', 'oklch(from red l c h)');
      expect(out.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('warning dedupes on repeat declarations of an unfoldable value', () => {
      transformDecl('backgroundColor', 'color-mix(in okhsv, red, blue)');
      transformDecl('backgroundColor', 'color-mix(in okhsv, red, blue)');
      transformDecl('backgroundColor', 'color-mix(in okhsv, red, blue)');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('theme hue sentinel oklch(… brandHue …) skips warn (resolver)', () => {
      transformDecl('color', 'oklch(0.7 0.15 \0sc:colors.brandHue:200)');
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describeOnRnWeb(() => {
    // Same static fold path as Hermes bundles: rn-web bundles still emit
    // hex so `@react-native/normalize-colors` never strips `color()`.
    it('parity: folds color(srgb 1 0 0) via transformDecl', () => {
      expect(transformDecl('backgroundColor', 'color(srgb 1 0 0)')).toEqual({
        backgroundColor: '#ff0000',
      });
    });

    it('parity: unknown interpolation space still emits warnOnce', () => {
      resetWarningsForTest();
      const w = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        transformDecl('backgroundColor', 'color(unknown-space 1 0 0)');
        expect(w).toHaveBeenCalledTimes(1);
      } finally {
        w.mockRestore();
      }
    });
  });
});

describe('color-mix() spec compliance (CSS Color Module Level 5 §3)', () => {
  // https://drafts.csswg.org/css-color-5/#color-mix
  // Hue keywords on cylindrical spaces: CSS Color Module Level 4 §13.4.

  function mix(value: string): string | null {
    return staticColorFunctionToHex(tokenize(value)[0]);
  }

  describe('§3 colorspace default + cylindrical hue interpolation', () => {
    it('omit `in …` behaves like explicit in oklab for red blue', () => {
      expect(mix('color-mix(red, blue)')).toBe(mix('color-mix(in oklab, red, blue)'));
    });

    it('accepts explicit `in oklab`', () => {
      expect(mix('color-mix(in oklab, red, blue)')).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('oklch accepts shorter longer increasing decreasing hue modifiers', () => {
      expect(mix('color-mix(in oklch shorter hue, red, yellow)')).toMatch(/^#[0-9a-f]{6}$/);
      expect(mix('color-mix(in oklch longer hue, red, yellow)')).toMatch(/^#[0-9a-f]{6}$/);
      expect(mix('color-mix(in oklch increasing hue, red, yellow)')).toMatch(/^#[0-9a-f]{6}$/);
      expect(mix('color-mix(in oklch decreasing hue, red, yellow)')).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('§3 percentage normalization', () => {
    // Equivalent weight spellings §3 prose; negatives invalid; summed weights clamp; leftover adjusts alpha.

    it('50/50, 50/implicit, implicit/50, both implicit agree in srgb', () => {
      const a = mix('color-mix(in srgb, red 50%, blue 50%)');
      expect(mix('color-mix(in srgb, red 50%, blue)')).toBe(a);
      expect(mix('color-mix(in srgb, red, blue 50%)')).toBe(a);
      expect(mix('color-mix(in srgb, red, blue)')).toBe(a);
    });

    it('80%/80% normalizes same as 50/50 when sum exceeds 100', () => {
      const a = mix('color-mix(in srgb, red 50%, blue 50%)');
      expect(mix('color-mix(in srgb, red 80%, blue 80%)')).toBe(a);
    });

    it('30%+30% mix leaves 40% unfilled multiplier so alpha byte is ~99', () => {
      const hex = mix('color-mix(in srgb, red 30%, blue 30%)');
      expect(hex).toMatch(/^#[0-9a-f]{6}99$/i);
    });

    // Color 5 §3: negative percentages are invalid.
    it('rejects negative mix weights', () => {
      expect(mix('color-mix(in srgb, red -10%, blue 50%)')).toBeNull();
      expect(mix('color-mix(in srgb, red 50%, blue -10%)')).toBeNull();
    });

    // CSS Values / Color 5: percentages above 100% clamp.
    it('clips a weight above 100% down to full stop at first color', () => {
      expect(mix('color-mix(in srgb, red 150%, blue)')).toBe(
        mix('color-mix(in srgb, red 100%, blue)')
      );
    });
  });

  describe('§3 leftover / unary / multi-stop results', () => {
    // §3: all-zero weights -> transparent black; unary list = that color; multi-stop examples in spec.

    it('0%+0% weights yield transparent black in srgb and oklch', () => {
      expect(mix('color-mix(in srgb, red 0%, blue 0%)')).toBe('#00000000');
      expect(mix('color-mix(in oklch, teal 0%, olive 0%)')).toBe('#00000000');
    });

    it('unary mix list returns that color unchanged in srgb', () => {
      expect(mix('color-mix(in srgb, red)')).toBe('#ff0000');
      expect(mix('color-mix(in srgb, red 100%)')).toBe('#ff0000');
    });

    it('three stops without explicit percents averages rgb channels into mid tone', () => {
      const hex = mix('color-mix(in srgb, red, green, blue)');
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      expect(hex).not.toBe('#ff0000');
      expect(hex).not.toBe('#0000ff');
      expect(hex).not.toBe('#008000');
    });

    it('accepts a 3-color list with explicit percentages summing to 100', () => {
      const hex = mix('color-mix(in srgb, red 50%, green 25%, blue 25%)');
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('§13.4 hue interpolation (oklch)', () => {
    it('omitted hue modifier matches explicit shorter hue for red yellow', () => {
      const a = mix('color-mix(in oklch, red, yellow)');
      const b = mix('color-mix(in oklch shorter hue, red, yellow)');
      expect(a).toBe(b);
    });

    it('shorter hue arc red→yellow midpoint is orange-leaning rgb order r>g>b', () => {
      const hex = mix('color-mix(in oklch shorter hue, red, yellow)')!;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      expect(r).toBeGreaterThan(g);
      expect(g).toBeGreaterThan(b);
    });

    it('longer hue arc disagrees with shorter for red yellow', () => {
      const shorter = mix('color-mix(in oklch shorter hue, red, yellow)');
      const longer = mix('color-mix(in oklch longer hue, red, yellow)');
      expect(shorter).not.toBe(longer);
    });

    it('increasing hue matches shorter when hue rises without wrap', () => {
      const inc = mix('color-mix(in oklch increasing hue, red, yellow)');
      const sh = mix('color-mix(in oklch shorter hue, red, yellow)');
      expect(inc).toBe(sh);
    });

    it('decreasing hue disagrees with shorter when start hue is numerically smaller', () => {
      const sh = mix('color-mix(in oklch shorter hue, red, yellow)');
      const dec = mix('color-mix(in oklch decreasing hue, red, yellow)');
      expect(dec).not.toBe(sh);
    });

    it('hue keyword after rectangular space ident is ignored same as omitting it', () => {
      const plain = mix('color-mix(in srgb, red, yellow)');
      const withMethod = mix('color-mix(in srgb shorter hue, red, yellow)');
      expect(withMethod).toBe(plain);
    });
  });

  describeOnRnWeb(() => {
    it('folds canonical srgb mix to hex (rn-web bundles share the fold path)', () => {
      expect(
        transformDecl('backgroundColor', 'color-mix(in srgb, red, blue)').backgroundColor
      ).toBe('#800080');
    });
  });
});

describe('out-of-gamut handling (OKLCh chroma bisection, CSS Color 4 §14 area)', () => {
  // Editor's draft css-color-4 §14 Gamut Mapping; full UA algorithm is §14.2.2
  // Binary Search Gamut Map with Local MINDE (#pseudo-binsearch). This suite
  // encodes observable behavior of our simplified chroma-only bisection
  // (see colorMath.ts); it is not pixel-identical to Local MINDE.
  // Convert a hex string back to OKLCh hue (degrees) so we can assert
  // the input hue survived gamut mapping.
  function hexToOklchHue(hex: string): number {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const linearize = (v: number) =>
      v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    const rL = linearize(r);
    const gL = linearize(g);
    const bL = linearize(b);
    const lc = 0.4122214708 * rL + 0.5363325363 * gL + 0.0514459929 * bL;
    const mc = 0.2119034982 * rL + 0.6806995451 * gL + 0.1073969566 * bL;
    const sc = 0.0883024619 * rL + 0.2817188376 * gL + 0.6299787005 * bL;
    const l_ = Math.cbrt(lc);
    const m_ = Math.cbrt(mc);
    const s_ = Math.cbrt(sc);
    const aOk = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
    const bOk = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
    let deg = (Math.atan2(bOk, aOk) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    return deg;
  }

  it('out-of-gamut oklch keeps hue family (vivid green stays green-ish)', () => {
    // `oklch(0.7 0.4 130)` is a high-chroma green well outside sRGB.
    // The bisection mapper holds L and h constant while reducing C, so
    // the output stays in the green family (110°-145°) without
    // rotating into yellow or cyan.
    const tok = tokenize('oklch(0.7 0.4 130)')[0];
    const hex = staticColorFunctionToHex(tok)!;
    const hue = hexToOklchHue(hex);
    expect(hue).toBeGreaterThan(110);
    expect(hue).toBeLessThan(145);
  });

  it('out-of-gamut oklch keeps hue family (vivid magenta stays magenta-ish)', () => {
    // High-chroma red-magenta outside sRGB. Bisection output stays
    // in the magenta-to-red family (340°-360°).
    const tok = tokenize('oklch(0.55 0.35 350)')[0];
    const hex = staticColorFunctionToHex(tok)!;
    const hue = hexToOklchHue(hex);
    expect(hue).toBeGreaterThan(340);
    expect(hue).toBeLessThan(360);
  });

  it('out-of-gamut oklch reduces chroma vs the in-gamut baseline', () => {
    // Same hue (130°) at two chromas: 0.4 (out of gamut) and 0.18
    // (in gamut). The mapped 0.4 result should land near the in-gamut
    // 0.18 result; chroma is cut down to the boundary, not channels.
    const out = staticColorFunctionToHex(tokenize('oklch(0.7 0.4 130)')[0])!;
    const inGamut = staticColorFunctionToHex(tokenize('oklch(0.7 0.18 130)')[0])!;
    // Same green family, similar G byte; mapped should be close.
    const gOut = parseInt(out.slice(3, 5), 16);
    const gIn = parseInt(inGamut.slice(3, 5), 16);
    expect(Math.abs(gOut - gIn)).toBeLessThan(40);
  });

  it('lightness >= 1 maps to white in destination', () => {
    const tok = tokenize('oklch(1.2 0.1 30)')[0];
    expect(staticColorFunctionToHex(tok)).toBe('#ffffff');
  });

  it('lightness <= 0 maps to black in destination', () => {
    const tok = tokenize('oklch(-0.1 0.1 30)')[0];
    expect(staticColorFunctionToHex(tok)).toBe('#000000');
  });

  it('out-of-gamut CIE lab keeps hue family', () => {
    // `lab(60% 100% 0)` puts a-axis at +125 (way outside sRGB). The
    // CSS Color 4 algo routes CIE Lab through OKLCh for the bisection,
    // so the result should still be reddish (R dominant) rather than
    // hue-rotated by per-channel clip.
    const tok = tokenize('lab(60% 100% 0)')[0];
    const hex = staticColorFunctionToHex(tok)!;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    expect(r).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(b);
  });

  it('in-gamut colors are byte-identical to pre-mapping output', () => {
    // Mid-gray is trivially in-gamut. The gamut-map fast path returns
    // the direct conversion unchanged.
    const tok = tokenize('oklch(0.5 0 0)')[0];
    const hex = staticColorFunctionToHex(tok)!;
    // L=0.5, C=0, H=0;neutral gray at oklab(0.5, 0, 0).
    // Should round to a single-byte mid-gray hex.
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    expect(r).toBe(g);
    expect(g).toBe(b);
    // L=0.5 in OKLab → ≈ #777 (perceptual midpoint)
    expect(r).toBeGreaterThan(0x60);
    expect(r).toBeLessThan(0xa0);
  });

  describeOnRnWeb(() => {
    it('parity: vivid green out-of-gamut keeps hue bucket after bisection', () => {
      const tok = tokenize('oklch(0.7 0.4 130)')[0];
      const hex = staticColorFunctionToHex(tok)!;
      const hue = hexToOklchHue(hex);
      expect(hue).toBeGreaterThan(110);
      expect(hue).toBeLessThan(145);
    });
  });
});

describe('gamut mapping spec compliance (CSS Color 4 §14)', () => {
  // Spec: https://drafts.csswg.org/css-color-4/#pseudo-binsearch
  // §14.2.2 “Sample Pseudocode for the Binary Search Gamut Mapping with Local MINDE”
  // (CSS Color Module Level 4 editor's draft). Verbatim steps our static fold matches:
  //   • “if the Lightness of origin_OkLCh is greater than or equal to 100%, convert … and return”
  //   • “if the Lightness of origin_OkLCh is less than than or equal to 0%, convert … and return”
  //   • “if inGamut(origin_OkLCh) is true, convert origin_OkLCh to destination and return …”
  //
  // Deviation: production code omits ΔE_OK / JND=0.02 / clip-vs-current MINDE loop;
  // it uses chroma bisection on [0, origin chroma] at fixed OKLCh L and hue (a/b axis)
  // until linear sRGB is in gamut. Tests below lock that mapper’s L/h/C monotonic behavior,
  // not bitwise MINDE output.

  // Convert an emitted hex back to oklch (L, C, h) so we can assert
  // the bisection invariants without going through colorMath internals.
  function hexToOklch(hex: string): { L: number; C: number; h: number } {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const linearize = (v: number) =>
      v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    const rL = linearize(r);
    const gL = linearize(g);
    const bL = linearize(b);
    const lc = 0.4122214708 * rL + 0.5363325363 * gL + 0.0514459929 * bL;
    const mc = 0.2119034982 * rL + 0.6806995451 * gL + 0.1073969566 * bL;
    const sc = 0.0883024619 * rL + 0.2817188376 * gL + 0.6299787005 * bL;
    const l_ = Math.cbrt(lc);
    const m_ = Math.cbrt(mc);
    const s_ = Math.cbrt(sc);
    const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
    const aOk = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
    const bOk = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
    const C = Math.hypot(aOk, bOk);
    let deg = (Math.atan2(bOk, aOk) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    return { L, C, h: deg };
  }

  it('in-gamut origin: early return unchanged (matches §14.2.2 in-gamut branch)', () => {
    // "if inGamut(origin_OkLCh) is true, convert origin_OkLCh to destination and return it as the gamut mapped color"
    // oklch(0.7 0.05 130) sits comfortably inside sRGB. The bisection
    // fast path returns the direct conversion; result decodes back to
    // (L≈0.7, C≈0.05, h≈130).
    const hex = staticColorFunctionToHex(tokenize('oklch(0.7 0.05 130)')[0])!;
    const back = hexToOklch(hex);
    expect(Math.abs(back.L - 0.7)).toBeLessThan(0.01);
    expect(Math.abs(back.C - 0.05)).toBeLessThan(0.005);
    // Hue tolerance: 8-bit hex quantization perturbs h by a few °.
    expect(Math.min(Math.abs(back.h - 130), 360 - Math.abs(back.h - 130))).toBeLessThan(3);
  });

  it('out-of-gamut origin: L preserved within bisection epsilon', () => {
    // Mapper holds OKLCh L while shrinking C toward an in-gamut linear RGB triple
    // (simplified chroma bisection vs full §14.2.2 MINDE). For oklch(0.7 0.4 130)
    // decoded L should remain ~0.7 within epsilon.
    const hex = staticColorFunctionToHex(tokenize('oklch(0.7 0.4 130)')[0])!;
    const back = hexToOklch(hex);
    expect(Math.abs(back.L - 0.7)).toBeLessThan(0.01);
  });

  it('out-of-gamut origin: H preserved within bisection epsilon', () => {
    // Same input, hue invariant. 130° (green) must stay 130°. Tolerance
    // absorbs 8-bit hex quantization on the way back out.
    const hex = staticColorFunctionToHex(tokenize('oklch(0.7 0.4 130)')[0])!;
    const back = hexToOklch(hex);
    expect(Math.min(Math.abs(back.h - 130), 360 - Math.abs(back.h - 130))).toBeLessThan(3);
  });

  it('out-of-gamut origin: C strictly less than origin C (bisection consequence)', () => {
    // Out-of-gamut origins must land inside the cube at chroma strictly below origin C.
    const hex = staticColorFunctionToHex(tokenize('oklch(0.7 0.4 130)')[0])!;
    const back = hexToOklch(hex);
    expect(back.C).toBeLessThan(0.4);
    expect(back.C).toBeGreaterThan(0.05);
  });

  it('pure sRGB red oklch(0.628 0.258 29.23) round-trips at full chroma', () => {
    // Pure sRGB red sits on the sRGB gamut boundary. The bisection
    // fast path detects in-gamut and short-circuits; chroma survives.
    // Hue 29.23° is sRGB red's OKLCh hue per Bottosson's tables.
    const hex = staticColorFunctionToHex(tokenize('oklch(0.628 0.258 29.23)')[0])!;
    const back = hexToOklch(hex);
    expect(back.C).toBeGreaterThan(0.24);
    expect(back.C).toBeLessThan(0.27);
    expect(Math.min(Math.abs(back.h - 29.23), 360 - Math.abs(back.h - 29.23))).toBeLessThan(3);
  });

  it('slightly out-of-gamut oklch(0.5 0.4 0) reduces chroma but stays red', () => {
    // L=0.5, C=0.4, h=0° (red-axis) is well outside sRGB at 0.4
    // chroma. Bisection cuts C to the gamut boundary; result is
    // still in the red family and red-dominant in sRGB.
    const hex = staticColorFunctionToHex(tokenize('oklch(0.5 0.4 0)')[0])!;
    const back = hexToOklch(hex);
    expect(back.C).toBeLessThan(0.4);
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    expect(r).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(b);
  });

  it('zero-chroma origin: bisection collapses to gray (§9.4 OkLCh powerless hue)', () => {
    // oklch(0.5 0 30) has |C| = 0; in-gamut fast path returns gray.
    // Spec (CSS Color 4 §9.4, oklch() prose): "If the chroma of an OkLCh color is 0% or 0,
    // the hue component is powerless." Assert neutral output only.
    const hex = staticColorFunctionToHex(tokenize('oklch(0.5 0 30)')[0])!;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    expect(r).toBe(g);
    expect(g).toBe(b);
  });

  describeOnRnWeb(() => {
    it('parity: §14 bisection L/h invariant on vivid green anchor', () => {
      const hex = staticColorFunctionToHex(tokenize('oklch(0.7 0.4 130)')[0])!;
      const back = hexToOklch(hex);
      expect(Math.abs(back.L - 0.7)).toBeLessThan(0.01);
      expect(Math.min(Math.abs(back.h - 130), 360 - Math.abs(back.h - 130))).toBeLessThan(3);
    });
  });
});

describe('line-clamp spec compliance (CSS Overflow Module Level 4 §5.1)', () => {
  // Spec source: https://drafts.csswg.org/css-overflow-4/#line-clamp
  // Grammar:
  //   line-clamp = none | [<integer [1,∞]> || <'block-ellipsis'>] -webkit-legacy?
  //   -webkit-line-clamp = none | <integer [1,∞]>
  // Polyfill maps to RN's `numberOfLines` on Text. RN's Text only
  // supports a fixed "…" ellipsis, so the <block-ellipsis> string
  // value (e.g. `"..."`) is parsed and silently ignored. The
  // -webkit-legacy keyword has no RN equivalent and is also ignored.

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('§5.1 line-clamp shorthand', () => {
    // Spec: `line-clamp = none | [<integer [1,∞]> || <block-ellipsis>] -webkit-legacy?`

    it('positive integer maps to numberOfLines + overflow hidden', () => {
      expect(transformDecl('line-clamp', '3')).toEqual({
        numberOfLines: 3,
        overflow: 'hidden',
      });
    });

    // Spec value "none": "Sets max-lines to none, continue to auto, and
    // block-ellipsis to no-ellipsis." On RN this maps to numberOfLines:
    // 0 (RN's "no limit") with no overflow override.
    it('none disables clamping (numberOfLines: 0, no overflow)', () => {
      expect(transformDecl('line-clamp', 'none')).toEqual({ numberOfLines: 0 });
    });

    // Spec grammar: <integer [1,∞]>. Zero is invalid as a line count.
    it('rejects zero (spec requires integer ≥ 1)', () => {
      expect(transformDecl('line-clamp', '0')).toEqual({});
    });

    it('rejects negative integers', () => {
      expect(transformDecl('line-clamp', '-2')).toEqual({});
    });

    it('rejects non-integer numbers', () => {
      expect(transformDecl('line-clamp', '1.5')).toEqual({});
    });

    // Spec: integer can be followed by a <block-ellipsis> string. RN's
    // Text only renders the default "…" ellipsis; we accept the integer
    // and silently drop the string per the documented deviation.
    it('accepts integer + <block-ellipsis> string (string ignored on RN)', () => {
      expect(transformDecl('line-clamp', '5 "..."')).toEqual({
        numberOfLines: 5,
        overflow: 'hidden',
      });
    });

    // Spec: -webkit-legacy keyword opts into the legacy fragmenter
    // behavior. No RN equivalent; we accept and ignore the keyword.
    it('accepts integer + -webkit-legacy (keyword ignored on RN)', () => {
      expect(transformDecl('line-clamp', '3 -webkit-legacy')).toEqual({
        numberOfLines: 3,
        overflow: 'hidden',
      });
    });

    // Spec: -webkit-legacy alone is invalid; the grammar requires the
    // legacy keyword to follow an integer or block-ellipsis.
    it('rejects bare -webkit-legacy', () => {
      expect(transformDecl('line-clamp', '-webkit-legacy')).toEqual({});
    });
  });

  describe('§5.1.1 -webkit-line-clamp legacy', () => {
    // Spec: `-webkit-line-clamp = none | <integer [1,∞]>`
    it('-webkit-line-clamp: positive integer', () => {
      expect(transformDecl('-webkit-line-clamp', '3')).toEqual({
        numberOfLines: 3,
        overflow: 'hidden',
      });
    });

    it('-webkit-line-clamp: none disables clamping', () => {
      expect(transformDecl('-webkit-line-clamp', 'none')).toEqual({ numberOfLines: 0 });
    });

    it('-webkit-line-clamp: rejects zero', () => {
      expect(transformDecl('-webkit-line-clamp', '0')).toEqual({});
    });
  });

  describeOnRnWeb(() => {
    // `lineClamp.ts` has no rn-web branch; Omni bundle emits the same
    // RN Text props consumed by rn-web primitives.
    it('parity: line-clamp integer maps numberOfLines + overflow hidden', () => {
      expect(transformDecl('line-clamp', '3')).toEqual({
        numberOfLines: 3,
        overflow: 'hidden',
      });
    });
  });
});

describe('linear() easing', () => {
  it('parses a simple linear curve', () => {
    const tok = tokenize('linear(0, 0.5, 1)')[0];
    const stops = parseLinearEasing(tok);
    expect(stops).toMatchInlineSnapshot(`
      [
        {
          "t": 0,
          "v": 0,
        },
        {
          "t": 0.5,
          "v": 0.5,
        },
        {
          "t": 1,
          "v": 1,
        },
      ]
    `);
  });

  it('parses a sigmoid-ish curve', () => {
    const tok = tokenize('linear(0, 0.2, 0.8, 1)')[0];
    const stops = parseLinearEasing(tok);
    expect(stops).toHaveLength(4);
    expect(stops![0].t).toBe(0);
    expect(stops![stops!.length - 1].t).toBe(1);
  });

  it('honors explicit input times', () => {
    const tok = tokenize('linear(0, 0.5 25%, 1)')[0];
    const stops = parseLinearEasing(tok);
    expect(stops).toHaveLength(3);
    expect(stops![1]).toMatchInlineSnapshot(`
      {
        "t": 0.25,
        "v": 0.5,
      }
    `);
  });
});

describe('linear() easing spec compliance (CSS Easing Functions Level 2 §2.1)', () => {
  // Spec source: https://drafts.csswg.org/css-easing-2/#the-linear-easing-function
  // Polyfill scope: parses control points into a list of {t, v} pairs
  // ready for the animation runtime. Output is the canonicalized form
  // per §2.1 (every control point has an input progress value, and
  // input values are monotonically non-decreasing).

  function stops(value: string) {
    return parseLinearEasing(tokenize(value)[0]);
  }

  describe('§2.1 grammar', () => {
    // Spec grammar: `linear() = linear( [ <number> && <percentage>{0,2} ]# )`
    //;1+ comma-separated args, each with one number and 0-2 percents.
    it('rejects an empty linear()', () => {
      expect(stops('linear()')).toBeNull();
    });

    it('accepts a single point: linear(0.5)', () => {
      // Spec §2.1.2: "If points holds only a single item, return the
      // output progress value of that item.";input doesn't matter.
      // Polyfill stores it with the canonicalized t=0.
      expect(stops('linear(0.5)')).toEqual([{ t: 0, v: 0.5 }]);
    });

    it('accepts a 2-point linear ramp: linear(0, 1)', () => {
      // Per Easing 1: "linear" keyword is equivalent to linear(0, 1).
      expect(stops('linear(0, 1)')).toEqual([
        { t: 0, v: 0 },
        { t: 1, v: 1 },
      ]);
    });

    // Spec: "When the argument has two <percentage>s, it defines two
    // control points in the specified order, one per <percentage>."
    it('expands a 2-percentage form into two control points (same v)', () => {
      // Spec example: "linear(0, 0.25 25% 75%, 1) serializes as
      //                linear(0, 0.25 25%, 0.25 75%, 1)"
      expect(stops('linear(0, 0.25 25% 75%, 1)')).toEqual([
        { t: 0, v: 0 },
        { t: 0.25, v: 0.25 },
        { t: 0.75, v: 0.25 },
        { t: 1, v: 1 },
      ]);
    });

    it('rejects more than two percentages on a single argument', () => {
      // 3+ percents violate `<percentage>{0,2}`.
      expect(stops('linear(0.5 10% 20% 30%)')).toBeNull();
    });

    it('rejects an argument missing the <number>', () => {
      expect(stops('linear(50%)')).toBeNull();
    });
  });

  describe('§2.1 canonicalization', () => {
    // Canonicalize step 1: "If the first control point lacks an input
    // progress value, set its input progress value to 0."
    it('first point with no input gets t=0', () => {
      const r = stops('linear(0.3, 1 100%)');
      expect(r![0].t).toBe(0);
    });

    // Step 2: "If the last control point lacks an input progress value,
    // set its input progress value to 1."
    it('last point with no input gets t=1', () => {
      const r = stops('linear(0 0%, 0.5)');
      expect(r![r!.length - 1].t).toBe(1);
    });

    // Step 3: "If any control point has an input progress value that is
    // less than the input progress value of any preceding control point,
    // set its input progress value to the largest input progress value
    // of any preceding control point."
    it('clamps a non-monotonic point up to the running max', () => {
      // Inputs: 0, 30%, 20%, 100% → after clamp: 0, 30%, 30%, 100%
      expect(stops('linear(0, 0.5 30%, 0.7 20%, 1)')).toEqual([
        { t: 0, v: 0 },
        { t: 0.3, v: 0.5 },
        { t: 0.3, v: 0.7 },
        { t: 1, v: 1 },
      ]);
    });

    // Step 4: "If any control point still lacks an input progress
    // value, then for each contiguous run of such control points, set
    // their input progress values so that they are evenly spaced
    // between the preceding and following control points with input
    // progress values."
    it('evenly distributes a contiguous run of unspecified inputs', () => {
      // Specified: 0% on first, 100% on last. Three middle points with
      // no input → spaced at 25%, 50%, 75%.
      expect(stops('linear(0, 0.25, 0.5, 0.75, 1)')).toEqual([
        { t: 0, v: 0 },
        { t: 0.25, v: 0.25 },
        { t: 0.5, v: 0.5 },
        { t: 0.75, v: 0.75 },
        { t: 1, v: 1 },
      ]);
    });

    it('distributes between explicit anchors', () => {
      // 0% at start, 80% on the explicit, 100% at end. Two unspecified
      // between 80% and 100%? Actually the implicit-runs case: between
      // 0% (first) and 80% (4th of 4 stops) we have 2 unspecified →
      // spaced at (80-0)/3 = ~26.67% and ~53.33%.
      const r = stops('linear(0, 0.25, 0.5, 0.75 80%, 1)');
      expect(r![0].t).toBe(0);
      expect(r![3].t).toBeCloseTo(0.8, 5);
      expect(r![4].t).toBe(1);
      expect(r![1].t).toBeCloseTo(0.8 / 3, 5);
      expect(r![2].t).toBeCloseTo((2 * 0.8) / 3, 5);
    });
  });

  describe('numeric ranges (no spec restriction)', () => {
    // Spec §2.1 doesn't restrict the numeric range;values can exceed
    // [0, 1] for output (overshoot) and [0, 100%] for input (extrapolate
    // outside the curve domain).
    it('accepts overshoot output values (e.g. > 1 or < 0)', () => {
      const r = stops('linear(0, 1.2 50%, 1)');
      expect(r![1].v).toBe(1.2);
    });

    it('accepts negative percentages on input', () => {
      const r = stops('linear(0 -10%, 0.5, 1 110%)');
      expect(r![0].t).toBe(-0.1);
      expect(r![r!.length - 1].t).toBe(1.1);
    });
  });

  describeOnRnWeb(() => {
    it('parity: parses the same easing sample as Hermes bundles', () => {
      expect(stops('linear(0, 0.5, 1)')).toEqual([
        { t: 0, v: 0 },
        { t: 0.5, v: 0.5 },
        { t: 1, v: 1 },
      ]);
    });
  });
});

describe('text-wrap spec compliance (CSS Text Module Level 4 §5.5)', () => {
  // Spec: text-wrap shorthand = <text-wrap-mode> || <text-wrap-style>
  //   text-wrap-mode  = wrap | nowrap
  //   text-wrap-style = auto | balance | stable | pretty
  //
  // RN 0.85 mapping (verified against StyleSheetTypes.d.ts + TextProps.js):
  //   - nowrap         → numberOfLines: 1 (Text prop via SPECIAL_CASE_PROPS)
  //   - balance        → textBreakStrategy: 'balanced'   (Android-only)
  //   - pretty         → textBreakStrategy: 'highQuality' (Android-only)
  //   - stable         → no equivalent on either platform; warnOnce
  //   - wrap / auto    → no-op (defaults)
  // The textWrap key is preserved on the style object so rn-web's browser
  // engine still honors the original shorthand.

  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('§5.5 grammar + RN mapping', () => {
    it('mode alone: wrap', () => {
      expect(transformDecl('text-wrap', 'wrap')).toEqual({ textWrap: 'wrap' });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('mode alone: nowrap maps to numberOfLines: 1 + ellipsizeMode: clip (CSS Text 4 §5.4 overflow approximation)', () => {
      // Spec `nowrap` overflows horizontally; RN cannot truly overflow,
      // so the polyfill silently applies the closest approximation
      // (`numberOfLines: 1` + `ellipsizeMode: 'clip'`). No warn; the
      // workaround matches the spec intent.
      expect(transformDecl('text-wrap', 'nowrap')).toEqual({
        textWrap: 'nowrap',
        numberOfLines: 1,
        ellipsizeMode: 'clip',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('style alone: auto', () => {
      expect(transformDecl('text-wrap', 'auto')).toEqual({ textWrap: 'auto' });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('style alone: balance maps to textBreakStrategy (Android)', () => {
      expect(transformDecl('text-wrap', 'balance')).toEqual({
        textWrap: 'balance',
        textBreakStrategy: 'balanced',
      });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(/text-wrap: balance/);
      expect(warnSpy.mock.calls[0][0]).toMatch(/iOS/);
    });

    it('style alone: pretty maps to textBreakStrategy (Android)', () => {
      expect(transformDecl('text-wrap', 'pretty')).toEqual({
        textWrap: 'pretty',
        textBreakStrategy: 'highQuality',
      });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(/text-wrap: pretty/);
    });

    it('style alone: stable warns (no RN equivalent)', () => {
      expect(transformDecl('text-wrap', 'stable')).toEqual({ textWrap: 'stable' });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(/text-wrap: stable/);
    });

    it('combined: nowrap balance (mode + style both translated; nowrap adds ellipsizeMode: clip)', () => {
      expect(transformDecl('text-wrap', 'nowrap balance')).toEqual({
        textWrap: 'nowrap balance',
        numberOfLines: 1,
        ellipsizeMode: 'clip',
        textBreakStrategy: 'balanced',
      });
    });

    it('combined: order independent per `||` grammar', () => {
      expect(transformDecl('text-wrap', 'balance wrap')).toEqual({
        textWrap: 'wrap balance',
        textBreakStrategy: 'balanced',
      });
    });

    it('rejects duplicate mode', () => {
      expect(transformDecl('text-wrap', 'wrap nowrap')).toEqual({});
    });

    it('rejects duplicate style', () => {
      expect(transformDecl('text-wrap', 'balance pretty')).toEqual({});
    });

    it('rejects unknown ident', () => {
      expect(transformDecl('text-wrap', 'foo')).toEqual({});
    });

    it('rejects empty value', () => {
      expect(transformDecl('text-wrap', '')).toEqual({});
    });
  });

  describe('dedupe', () => {
    it('warns at most once per problematic value', () => {
      transformDecl('text-wrap', 'balance');
      transformDecl('text-wrap', 'balance');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });

  // CSS Text 4 §5.4 (text-wrap-mode) and §5.5 (text-wrap-style) define
  // the longhands. The shorthand block above covers behavior; this block
  // confirms the longhands can be set independently and route to the
  // same RN-effective props.
  describe('§5.4 / §5.5 longhand registration', () => {
    it('text-wrap-mode: wrap is a no-op (initial value)', () => {
      expect(transformDecl('text-wrap-mode', 'wrap')).toEqual({ textWrapMode: 'wrap' });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('text-wrap-mode: nowrap maps to numberOfLines: 1 + ellipsizeMode: clip (CSS Text 4 §5.4 overflow approximation)', () => {
      // Workaround applied silently (no horizontal overflow surface on
      // RN, so we clip; matches spec intent).
      expect(transformDecl('text-wrap-mode', 'nowrap')).toEqual({
        textWrapMode: 'nowrap',
        numberOfLines: 1,
        ellipsizeMode: 'clip',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('text-wrap-style: auto is a no-op (initial value)', () => {
      expect(transformDecl('text-wrap-style', 'auto')).toEqual({ textWrapStyle: 'auto' });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('text-wrap-style: balance maps to textBreakStrategy + iOS warn', () => {
      expect(transformDecl('text-wrap-style', 'balance')).toEqual({
        textWrapStyle: 'balance',
        textBreakStrategy: 'balanced',
      });
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('text-wrap-style: pretty maps to textBreakStrategy + iOS warn', () => {
      expect(transformDecl('text-wrap-style', 'pretty')).toEqual({
        textWrapStyle: 'pretty',
        textBreakStrategy: 'highQuality',
      });
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('text-wrap-style: stable warns + emits the original key', () => {
      expect(transformDecl('text-wrap-style', 'stable')).toEqual({ textWrapStyle: 'stable' });
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('rejects unknown mode keyword', () => {
      expect(transformDecl('text-wrap-mode', 'foo')).toEqual({});
    });

    it('rejects unknown style keyword', () => {
      expect(transformDecl('text-wrap-style', 'foo')).toEqual({});
    });
  });

  // Chrome 114+, Safari 17.4+, and Firefox 121+ implement the
  // `text-wrap` shorthand and longhands natively. On rn-web we emit only
  // the original property + value so the browser does its own line-
  // breaking; the RN-prop lifts (numberOfLines / ellipsizeMode /
  // textBreakStrategy) would fight the browser's implementation.
  describeOnRnWeb(() => {
    it('text-wrap: nowrap emits only the shorthand', () => {
      expect(transformDecl('text-wrap', 'nowrap')).toEqual({ textWrap: 'nowrap' });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('text-wrap: balance emits only the shorthand', () => {
      expect(transformDecl('text-wrap', 'balance')).toEqual({ textWrap: 'balance' });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('text-wrap-mode: nowrap emits only the longhand', () => {
      expect(transformDecl('text-wrap-mode', 'nowrap')).toEqual({ textWrapMode: 'nowrap' });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('text-wrap-style: pretty emits only the longhand', () => {
      expect(transformDecl('text-wrap-style', 'pretty')).toEqual({ textWrapStyle: 'pretty' });
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});

describe('hyphens spec compliance (CSS Text Module Level 4 §6.3.1)', () => {
  // Spec source: drafts.csswg.org/css-text-4/#hyphens-property
  //
  //   Name:        hyphens
  //   Value:       none | manual | auto
  //   Initial:     manual
  //   Applies to:  text
  //
  // RN 0.85 mapping (verified against Text.d.ts:100):
  //   - Android: `android_hyphenationFrequency: 'none' | 'normal' | 'full'`
  //     is a Text component prop, lifted via SPECIAL_CASE_PROPS like
  //     numberOfLines / textBreakStrategy.
  //   - iOS: no equivalent style or prop in 0.85. Soft-hyphens in source
  //     text still break naturally on both platforms, so spec `manual`
  //     matches iOS native behavior regardless of the declaration.
  //   - rn-web: browser handles `hyphens` natively from the style key.

  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('§6.3.1 value definitions + RN mapping', () => {
    // Spec verbatim: "Words are not hyphenated, even if characters inside
    // the word explicitly define hyphenation opportunities."
    it('hyphens: none → android_hyphenationFrequency: "none"', () => {
      expect(transformDecl('hyphens', 'none')).toEqual({
        hyphens: 'none',
        android_hyphenationFrequency: 'none',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    // Spec verbatim: "Words are only hyphenated where there are characters
    // inside the word that explicitly suggest hyphenation opportunities."
    // Mapped to android `'none'` because Android's text engine honors
    // explicit U+00AD soft-hyphens irrespective of the frequency setting.
    it('hyphens: manual → android_hyphenationFrequency: "none" (soft-hyphens still honored)', () => {
      expect(transformDecl('hyphens', 'manual')).toEqual({
        hyphens: 'manual',
        android_hyphenationFrequency: 'none',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    // Spec verbatim: "Words may be broken at hyphenation opportunities
    // determined automatically by a language-appropriate hyphenation
    // resource in addition to those indicated explicitly by a conditional
    // hyphen."
    it('hyphens: auto → android_hyphenationFrequency: "normal" + iOS warn', () => {
      expect(transformDecl('hyphens', 'auto')).toEqual({
        hyphens: 'auto',
        android_hyphenationFrequency: 'normal',
      });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(/hyphens: auto/);
      expect(warnSpy.mock.calls[0][0]).toMatch(/iOS/);
    });
  });

  describe('on Android', () => {
    const realOS = Platform.OS;
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    });
    afterEach(() => {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: realOS });
    });

    it('hyphens: auto maps without the iOS-only dev warn', () => {
      expect(transformDecl('hyphens', 'auto')).toEqual({
        hyphens: 'auto',
        android_hyphenationFrequency: 'normal',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('invalid input', () => {
    // Spec value-list is closed: only `none | manual | auto` accepted.
    it('unknown keyword drops the declaration', () => {
      expect(transformDecl('hyphens', 'never')).toEqual({});
    });

    it('rejects multi-token values (single ident grammar)', () => {
      expect(transformDecl('hyphens', 'auto manual')).toEqual({});
    });
  });

  describe('dedupe', () => {
    it('warns at most once on repeated auto declarations', () => {
      transformDecl('hyphens', 'auto');
      transformDecl('hyphens', 'auto');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });

  describeOnRnWeb(() => {
    // Browser handles `hyphens` natively; the Android prop lift and the
    // iOS-limitation warn are meaningless on web.
    it('emits hyphens only, no android_hyphenationFrequency lift', () => {
      expect(transformDecl('hyphens', 'auto')).toEqual({ hyphens: 'auto' });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it.each(['none', 'manual', 'auto'])('%s passes the spec keyword through', value => {
      expect(transformDecl('hyphens', value)).toEqual({ hyphens: value });
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});

describe('gap spec compliance (CSS Box Alignment 3 §8.3)', () => {
  // Spec: gap = <'row-gap'> <'column-gap'>?
  // Each axis: normal | <length-percentage [0,∞]>
  // RN 0.85 supports gap (single value) + rowGap + columnGap natively.
  // We pass the one-value form as `gap`; two-value splits to longhands.

  it('single value emits gap', () => {
    expect(transformDecl('gap', '12px')).toEqual({ gap: 12 });
  });

  it('two values split into rowGap / columnGap', () => {
    expect(transformDecl('gap', '8px 12px')).toEqual({ rowGap: 8, columnGap: 12 });
  });

  it('two values with one zero', () => {
    expect(transformDecl('gap', '0 16px')).toEqual({ rowGap: 0, columnGap: 16 });
  });

  it('accepts percentage axis values', () => {
    expect(transformDecl('gap', '10% 5%')).toEqual({ rowGap: '10%', columnGap: '5%' });
  });

  it('accepts normal keyword', () => {
    expect(transformDecl('gap', 'normal')).toEqual({ gap: 'normal' });
  });

  it('rejects three values (per grammar)', () => {
    expect(transformDecl('gap', '4px 8px 12px')).toEqual({});
  });

  it('rejects unknown ident', () => {
    expect(transformDecl('gap', 'foo')).toEqual({});
  });

  describeOnRnWeb(() => {
    it('gap expansion matches Yoga output on native bundles', () => {
      expect(transformDecl('gap', '8px 12px')).toEqual({ rowGap: 8, columnGap: 12 });
    });
  });
});

describe('outline spec compliance (CSS UI 4 §6)', () => {
  // Spec: outline = <'outline-width'> || <'outline-style'> || <'outline-color'>
  // RN 0.85 supports outlineWidth / outlineStyle / outlineColor / outlineOffset
  // longhands but not the shorthand. outlineStyle is restricted to
  // 'solid' | 'dotted' | 'dashed'; web-only styles warn and pass through
  // for rn-web.

  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('width + style + color', () => {
    expect(transformDecl('outline', '2px solid red')).toEqual({
      outlineWidth: 2,
      outlineStyle: 'solid',
      outlineColor: 'red',
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('order independent (color first)', () => {
    expect(transformDecl('outline', 'red 2px solid')).toEqual({
      outlineWidth: 2,
      outlineStyle: 'solid',
      outlineColor: 'red',
    });
  });

  it('width only', () => {
    expect(transformDecl('outline', '3px')).toEqual({ outlineWidth: 3 });
  });

  it('style only', () => {
    expect(transformDecl('outline', 'dotted')).toEqual({ outlineStyle: 'dotted' });
  });

  it('color only', () => {
    expect(transformDecl('outline', '#abc')).toEqual({ outlineColor: '#abc' });
  });

  it('none short-circuits to zero width', () => {
    expect(transformDecl('outline', 'none')).toEqual({
      outlineWidth: 0,
      outlineStyle: 'solid',
      outlineColor: 'transparent',
    });
  });

  it.each(['auto', 'double', 'groove', 'ridge', 'inset', 'outset'])(
    'web-only style: %s passes through with warnOnce',
    style => {
      expect(transformDecl('outline', `2px ${style} red`)).toEqual({
        outlineWidth: 2,
        outlineStyle: style,
        outlineColor: 'red',
      });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(new RegExp(`outline-style: ${style}`));
    }
  );

  describeOnRnWeb(() => {
    it('web-only outline-style emits without RN-only dev warnings', () => {
      expect(transformDecl('outline', '2px double red')).toEqual({
        outlineWidth: 2,
        outlineStyle: 'double',
        outlineColor: 'red',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  it('rejects empty', () => {
    expect(transformDecl('outline', '')).toEqual({});
  });

  it('rejects unknown ident', () => {
    expect(transformDecl('outline', 'wibble')).toEqual({});
  });
});

describe('standalone transform properties (CSS Transforms 2 §3)', () => {
  // Spec:
  //   translate: <length-percentage> <length-percentage>? <length>?
  //   rotate:    <angle> | [x|y|z] <angle>
  //   scale:     <number-percentage>{1,3}
  // RN 0.85 has no top-level translate / rotate / scale style keys; we lower
  // to a CSS `transform` string which RN parses natively. Composition with
  // an authored `transform:` is left to the cascade (last decl wins).

  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('translate', () => {
    it('single value (x only)', () => {
      expect(transformDecl('translate', '10px')).toEqual({ transform: 'translateX(10px)' });
    });

    it('two values (x y)', () => {
      expect(transformDecl('translate', '10px 20px')).toEqual({
        transform: 'translate(10px, 20px)',
      });
    });

    it('zero values render without units', () => {
      expect(transformDecl('translate', '0 16px')).toEqual({
        transform: 'translate(0, 16px)',
      });
    });

    it('three values (3D) preserve Z via processTransform 3-arg translate', () => {
      // RN's processTransform parses `translate(x, y, z)` into a 3-arg
      // array form, so Z survives on iOS and Android.
      expect(transformDecl('translate', '10px 20px 5px')).toEqual({
        transform: 'translate(10px, 20px, 5px)',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('rejects empty', () => {
      expect(transformDecl('translate', '')).toEqual({});
    });
  });

  describe('rotate', () => {
    it('angle only', () => {
      expect(transformDecl('rotate', '45deg')).toEqual({ transform: 'rotate(45deg)' });
    });

    it('with explicit z axis', () => {
      expect(transformDecl('rotate', 'z 45deg')).toEqual({ transform: 'rotateZ(45deg)' });
    });

    it('with x axis', () => {
      expect(transformDecl('rotate', 'x 30deg')).toEqual({ transform: 'rotateX(30deg)' });
    });

    it('with y axis', () => {
      expect(transformDecl('rotate', 'y 60deg')).toEqual({ transform: 'rotateY(60deg)' });
    });

    it('rejects non-angle', () => {
      expect(transformDecl('rotate', '45')).toEqual({});
    });
  });

  describe('scale', () => {
    it('single number value', () => {
      expect(transformDecl('scale', '2')).toEqual({ transform: 'scale(2)' });
    });

    it('two values emit scaleX + scaleY (RN rejects scale(x, y) in string form)', () => {
      expect(transformDecl('scale', '2 0.5')).toEqual({ transform: 'scaleX(2) scaleY(0.5)' });
    });

    it('single percentage value', () => {
      expect(transformDecl('scale', '50%')).toEqual({ transform: 'scale(0.5)' });
    });

    it('three values (3D) warn + drop Z', () => {
      expect(transformDecl('scale', '2 1 0.5')).toEqual({ transform: 'scaleX(2) scaleY(1)' });
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('rejects length values', () => {
      expect(transformDecl('scale', '2px')).toEqual({});
    });
  });

  describeOnRnWeb(() => {
    // rn-web's `preprocess` passes the standalone `translate` / `rotate`
    // / `scale` keys through unchanged; the browser parses each
    // independent CSS property surface (CSS Transforms 2 §3) end-to-end.
    // Emitting `transform: translate(...)` would force the browser to
    // process the value through `transform` instead, and drop the Z
    // component when present. Pass the raw value through and let the
    // browser handle 2D + 3D forms uniformly.

    it('translate single value passes through as standalone prop', () => {
      expect(transformDecl('translate', '10px')).toEqual({ translate: '10px' });
    });

    it('translate 2D value passes through, no warn', () => {
      expect(transformDecl('translate', '10px 20px')).toEqual({ translate: '10px 20px' });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('translate 3D value keeps Z, no warn (browser handles z natively)', () => {
      expect(transformDecl('translate', '10px 20px 5px')).toEqual({
        translate: '10px 20px 5px',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('rotate angle passes through', () => {
      expect(transformDecl('rotate', '45deg')).toEqual({ rotate: '45deg' });
    });

    it('rotate axis + angle passes through', () => {
      expect(transformDecl('rotate', 'x 30deg')).toEqual({ rotate: 'x 30deg' });
    });

    it('scale single value passes through', () => {
      expect(transformDecl('scale', '2')).toEqual({ scale: '2' });
    });

    it('scale two values passes through, no transform decomposition', () => {
      expect(transformDecl('scale', '2 0.5')).toEqual({ scale: '2 0.5' });
    });

    it('scale 3D value keeps Z, no warn', () => {
      expect(transformDecl('scale', '2 1 0.5')).toEqual({ scale: '2 1 0.5' });
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});

// https://drafts.csswg.org/css-ui-4/#interactivity
describe('interactivity spec compliance (CSS UI 4 §6.3)', () => {
  let warnSpy: jest.SpyInstance;
  const realOS = Platform.OS;
  beforeEach(() => {
    resetWarningsForTest();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: realOS });
  });

  it('interactivity: auto is a no-op (initial value)', () => {
    expect(transformDecl('interactivity', 'auto')).toEqual({});
    expect(warnSpy).not.toHaveBeenCalled();
  });

  // Spec bullet 1: "Hit-testing must act as if `pointer-events` was
  // `none`, regardless of its actual value."
  // Spec bullet 2: "Text selection must act as if `user-select` was
  // `none`, regardless of its actual value."
  // Spec bullet 3: "If the element or text node is editable, it must
  // behave as if it was non-editable."
  // Spec bullet 4: a11y subtree is hidden / unreachable.
  it('interactivity: inert lifts pointer / a11y / focus / selection / editable', () => {
    expect(transformDecl('interactivity', 'inert')).toEqual({
      pointerEvents: 'none',
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no-hide-descendants',
      focusable: false,
      selectable: false,
      editable: false,
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('warns about descendant focus leaks on Android only', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    expect(transformDecl('interactivity', 'inert')).toEqual({
      pointerEvents: 'none',
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no-hide-descendants',
      focusable: false,
      selectable: false,
      editable: false,
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/cannot stop focus/);
    expect(warnSpy.mock.calls[0][0]).toMatch(/Android/);
  });

  it('rejects unknown keyword', () => {
    expect(transformDecl('interactivity', 'banana')).toEqual({});
  });

  describeOnRnWeb(() => {
    // The browser implements every inert surface (hit-test, focus,
    // selection, edit-suppression, a11y) via the HTML `inert`
    // attribute. rn-web forwards `inert` to the DOM verbatim, so a
    // single boolean covers what native needs six props for.
    it('inert lifts the HTML inert attribute (browser handles end-to-end)', () => {
      expect(transformDecl('interactivity', 'inert')).toEqual({ inert: true });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('auto clears the inert attribute', () => {
      expect(transformDecl('interactivity', 'auto')).toEqual({ inert: false });
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});

// https://drafts.csswg.org/css-forms-1/#field-sizing
describe('field-sizing spec compliance (CSS Form Control Styling 1 §7.1)', () => {
  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // "Initial: fixed; Applies to: elements with default preferred size;
  // Inherited: no; Computed value: as specified; Animation type: discrete."
  it('field-sizing: fixed is a no-op on native (initial value)', () => {
    expect(transformDecl('field-sizing', 'fixed')).toEqual({});
    expect(warnSpy).not.toHaveBeenCalled();
  });

  // "content: The UA must determine the element's intrinsic size based
  // on its content, and must ignore any default preferred size defined
  // by the host language."
  it('field-sizing: content lifts multiline + fieldSizing flag on native', () => {
    expect(transformDecl('field-sizing', 'content')).toEqual({
      multiline: true,
      fieldSizing: 'content',
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('rejects unknown keyword', () => {
    expect(transformDecl('field-sizing', 'auto')).toEqual({});
    expect(transformDecl('field-sizing', 'banana')).toEqual({});
  });

  it('rejects multi-token values', () => {
    expect(transformDecl('field-sizing', 'content fixed')).toEqual({});
  });

  describeOnRnWeb(() => {
    it('content passes through to the browser CSS engine + lifts multiline so rn-web renders a textarea', () => {
      expect(transformDecl('field-sizing', 'content')).toEqual({
        multiline: true,
        fieldSizing: 'content',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('fixed passes through to the browser CSS engine', () => {
      expect(transformDecl('field-sizing', 'fixed')).toEqual({ fieldSizing: 'fixed' });
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});

// CSS Transforms 2 §8: https://drafts.csswg.org/css-transforms-2/#perspective-property
describe('perspective spec compliance (CSS Transforms 2 §8)', () => {
  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // The polyfill emits a sentinel key (`__sc_perspective`) that
  // `compileNative.processDecls` folds into the final `transform` string
  // after all decls in the block have run. End-to-end composition with
  // an author-declared `transform:` is covered in
  // `native.test.tsx › perspective composition` (full pipeline).

  // "Initial: none. Syntax: none | <length [0,∞]>."
  it('perspective: none → sentinel cleared transform', () => {
    expect(transformDecl('perspective', 'none')).toEqual({ __sc_perspective: 'none' });
  });

  it('perspective: <length> emits a perspective() sentinel', () => {
    expect(transformDecl('perspective', '800px')).toEqual({
      __sc_perspective: 'perspective(800px)',
    });
  });

  // Spec note: "Lengths less than 1px are clamped at 1px for rendering."
  it('perspective: < 1px clamps to 1px', () => {
    expect(transformDecl('perspective', '0.4px')).toEqual({
      __sc_perspective: 'perspective(1px)',
    });
  });

  it('perspective: bare 0 treated as a near-zero length and clamped to 1px', () => {
    expect(transformDecl('perspective', '0')).toEqual({
      __sc_perspective: 'perspective(1px)',
    });
  });

  it('rejects negative lengths', () => {
    expect(transformDecl('perspective', '-200px')).toEqual({});
  });

  it('rejects keyword other than none', () => {
    expect(transformDecl('perspective', 'flat')).toEqual({});
  });

  // The browser implements `perspective` as a first-class property that
  // applies to descendants' 3D contexts (CSS Transforms 2 §8). On rn-web
  // we emit the raw `perspective: <length>` property and skip the
  // sentinel-into-transform fold; the browser handles the descendant
  // composition that RN can't natively express.
  describeOnRnWeb(() => {
    it('passes raw <length> through as perspective: <length>', () => {
      expect(transformDecl('perspective', '800px')).toEqual({ perspective: '800px' });
    });

    it('passes none through as perspective: none', () => {
      expect(transformDecl('perspective', 'none')).toEqual({ perspective: 'none' });
    });
  });
});

// CSS Transforms 2 §7: https://drafts.csswg.org/css-transforms-2/#transform-style-property
describe('transform-style spec compliance (CSS Transforms 2 §7)', () => {
  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('transform-style: flat is a no-op on native (initial value)', () => {
    expect(transformDecl('transform-style', 'flat')).toEqual({});
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('transform-style: preserve-3d drops on native + warns once', () => {
    expect(transformDecl('transform-style', 'preserve-3d')).toEqual({});
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/preserve-3d/);
  });

  it('rejects unknown keyword', () => {
    expect(transformDecl('transform-style', 'banana')).toEqual({});
  });

  describeOnRnWeb(() => {
    it('passes preserve-3d through (browser honors)', () => {
      expect(transformDecl('transform-style', 'preserve-3d')).toEqual({
        transformStyle: 'preserve-3d',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});

// CSS Transforms 1 §5: https://drafts.csswg.org/css-transforms-1/#transform-box
describe('transform-box spec compliance (CSS Transforms 1 §5)', () => {
  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([['content-box'], ['border-box'], ['fill-box'], ['stroke-box'], ['view-box']])(
    'transform-box: %s drops the declaration on native and warns once',
    value => {
      expect(transformDecl('transform-box', value)).toEqual({});
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(/transform-box/);
      expect(warnSpy.mock.calls[0][0]).toMatch(/ignored on React Native/);
    }
  );

  it('rejects an unknown keyword', () => {
    expect(transformDecl('transform-box', 'banana')).toEqual({});
  });

  describeOnRnWeb(() => {
    it('passes the value through (browser honors)', () => {
      expect(transformDecl('transform-box', 'border-box')).toEqual({ transformBox: 'border-box' });
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});

describe('caret-color spec compliance (CSS UI 4 §5.2.1)', () => {
  // Spec source: drafts.csswg.org/css-ui-4/#caret-color
  //
  //   Name:        caret-color
  //   Value:       auto | <color> [auto | <color>]?
  //   Initial:     auto
  //   Applies to:  text or elements that accept text input
  //   Inherited:   yes
  //
  // RN 0.85 mapping (verified against TextInput.d.ts:362 + TextInput.js:745):
  //   - Android: `cursorColor` is a TextInput prop that "set[s] the color
  //     of the cursor (or 'caret') in the component" "independently from
  //     the color of the text selection box". Spec-precise on Android.
  //     Lifted via SPECIAL_CASE_PROPS.
  //   - iOS: RN provides no API to color the caret without also tinting
  //     the selection range. The polyfill lifts `selectionColor` on iOS
  //     so the caret picks up the authored color; the selection highlight
  //     gets the same color as a side-effect (broader than spec but
  //     visible vs. no effect at all). A one-time informational warn
  //     names the deviation.
  //   - rn-web: browser handles `caretColor` natively from the style key.
  //
  // Spec verbatim for value definitions:
  //   "This property controls the color of the insertion caret. It takes
  //   one or two values. The first value has the following effects:"
  //   - auto: "User agents should use currentColor. User agents may
  //     automatically adjust the color of caret to ensure good visibility
  //     and contrast..."
  //   - <color>: "The caret is colored with the specified color."

  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('§5.2.1 single-value form', () => {
    // Spec verbatim: "User agents should use currentColor." auto matches
    // RN's default behavior on every platform. We emit only the style
    // key so rn-web sees it and native UAs keep their default caret.
    it('caret-color: auto → caretColor style only, no cursorColor lift', () => {
      expect(transformDecl('caret-color', 'auto')).toEqual({ caretColor: 'auto' });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    // Spec verbatim: "The caret is colored with the specified color."
    // Named color form. iOS lifts `selectionColor` as the only available
    // caret tint surface; the test runs under jest's RN preset which
    // defaults Platform.OS to 'ios', so we assert the three-key emit
    // here.
    it('caret-color: red → caretColor + cursorColor + selectionColor + iOS deviation warn', () => {
      expect(transformDecl('caret-color', 'red')).toEqual({
        caretColor: 'red',
        cursorColor: 'red',
        selectionColor: 'red',
      });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(/caret-color/);
      expect(warnSpy.mock.calls[0][0]).toMatch(/iOS/);
    });

    it('caret-color: #00aacc → hex color emits the three keys on iOS', () => {
      expect(transformDecl('caret-color', '#00aacc')).toEqual({
        caretColor: '#00aacc',
        cursorColor: '#00aacc',
        selectionColor: '#00aacc',
      });
    });

    it('caret-color: rgb(0 170 204) → function color emits the three keys on iOS', () => {
      expect(transformDecl('caret-color', 'rgb(0 170 204)')).toEqual({
        caretColor: 'rgb(0 170 204)',
        cursorColor: 'rgb(0 170 204)',
        selectionColor: 'rgb(0 170 204)',
      });
    });

    it('caret-color: currentColor → ident color emits the three keys on iOS', () => {
      // currentColor is a <color> per CSS Color 4. The rn-web browser
      // resolves it; native RN's normalizeColor doesn't, so the lift
      // would be ignored in this case. We still emit it so the value
      // reaches the native side; RN handles "unknown color" by leaving
      // the default in place.
      expect(transformDecl('caret-color', 'currentColor')).toEqual({
        caretColor: 'currentColor',
        cursorColor: 'currentColor',
        selectionColor: 'currentColor',
      });
    });
  });

  describe('§5.2.1 two-value form', () => {
    // Spec verbatim: "If caret-shape is block, or auto behaving as block,
    // then it determines the color of the text overlapping the caret.
    // If the second value is omitted, the behavior is the same as if
    // auto had been specified."
    //
    // RN has no block-caret rendering, so the second value has no effect
    // anywhere our polyfill emits. We accept the grammar and apply only
    // the first value with a warnOnce documenting the limitation.

    it('caret-color: red auto → first value drives all keys + block-caret warn', () => {
      expect(transformDecl('caret-color', 'red auto')).toEqual({
        caretColor: 'red',
        cursorColor: 'red',
        selectionColor: 'red',
      });
      // One warn for the iOS deviation, one for the block-caret second value.
      expect(warnSpy).toHaveBeenCalledTimes(2);
      const messages = warnSpy.mock.calls.map(c => c[0]).join('\n');
      expect(messages).toMatch(/iOS/);
      expect(messages).toMatch(/second value|block/);
    });

    it('caret-color: Highlight auto folds system color (multi-token skips decl-level fold)', () => {
      const out = transformDecl('caret-color', 'Highlight auto');
      expect(out.caretColor).toEqual({
        semantic: expect.arrayContaining(['quaternarySystemFill', '?attr/colorControlHighlight']),
      });
      expect(out.cursorColor).toEqual(out.caretColor);
      expect(out.selectionColor).toEqual(out.caretColor);
      expect(warnSpy).toHaveBeenCalledTimes(2);
    });

    it('caret-color: auto blue → first auto, no cursorColor lift, block-caret warn', () => {
      expect(transformDecl('caret-color', 'auto blue')).toEqual({ caretColor: 'auto' });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(/second value|block/);
    });
  });

  describe('invalid input', () => {
    // Grammar is `auto | <color> [auto | <color>]?`. Non-color functions
    // and unknown idents fail the <color> production and drop.
    it('three tokens drops the declaration', () => {
      expect(transformDecl('caret-color', 'red blue green')).toEqual({});
    });

    it('numeric-only drops the declaration', () => {
      expect(transformDecl('caret-color', '42px')).toEqual({});
    });

    it('non-color function drops the declaration', () => {
      expect(transformDecl('caret-color', 'calc(1px)')).toEqual({});
    });

    it('unknown ident drops the declaration', () => {
      expect(transformDecl('caret-color', 'notacolor')).toEqual({});
    });
  });

  describe('dedupe', () => {
    it('warns at most once on repeated <color> declarations', () => {
      transformDecl('caret-color', 'red');
      transformDecl('caret-color', 'red');
      transformDecl('caret-color', 'blue');
      // iOS-deviation warn fires once globally (no per-value suffix).
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });

  describeOnRnWeb(() => {
    // The browser handles `caret-color` end-to-end; the Android
    // `cursorColor` TextInput prop is meaningless on web, and the iOS
    // limitation doesn't apply. Emit the style key only.
    it('emits caretColor only, no cursorColor lift, no iOS warn', () => {
      expect(transformDecl('caret-color', 'red')).toEqual({ caretColor: 'red' });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('auto still emits caretColor: auto with no warn', () => {
      expect(transformDecl('caret-color', 'auto')).toEqual({ caretColor: 'auto' });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('two-value form drops the second value silently (browser handles caret-shape)', () => {
      expect(transformDecl('caret-color', 'red auto')).toEqual({ caretColor: 'red' });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('two-value form keeps system keywords as CSS strings', () => {
      expect(transformDecl('caret-color', 'Highlight auto')).toEqual({
        caretColor: 'Highlight',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});

describe('text-decoration platform skew (Android underline color)', () => {
  // RN 0.85's `TextStyleAndroid` omits `textDecorationColor` and
  // `textDecorationStyle`; both are iOS-only. Android paints the
  // underline in the text color via `ReactUnderlineSpan` (extends
  // `android.text.style.UnderlineSpan` unchanged), and the shadow
  // tree drops the unrecognized keys silently. We warn so consumers
  // hit by the discrepancy aren't left wondering why their underline
  // is the wrong color on Android.
  const realOS = Platform.OS;

  describe('on Android', () => {
    let warnSpy: jest.SpyInstance;
    beforeEach(() => {
      resetWarningsForTest();
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
      warnSpy.mockRestore();
      Object.defineProperty(Platform, 'OS', { configurable: true, value: realOS });
    });

    it('warns + emits color when text-decoration carries an explicit color', () => {
      expect(transformDecl('text-decoration', 'underline #f00')).toEqual({
        textDecorationLine: 'underline',
        textDecorationStyle: 'solid',
        textDecorationColor: '#f00',
      });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(/text-decoration-color/);
      expect(warnSpy.mock.calls[0][0]).toMatch(/ignored on Android/);
    });

    it('does not warn when text-decoration omits the color (default black falls back)', () => {
      expect(transformDecl('text-decoration', 'underline')).toEqual({
        textDecorationLine: 'underline',
        textDecorationStyle: 'solid',
        textDecorationColor: 'black',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('dedupe gates on the raw color value (one warn per unique color)', () => {
      transformDecl('text-decoration', 'underline #f00');
      transformDecl('text-decoration', 'underline #f00');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      transformDecl('text-decoration', 'underline #0f0');
      expect(warnSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('on iOS', () => {
    let warnSpy: jest.SpyInstance;
    beforeEach(() => {
      resetWarningsForTest();
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
      warnSpy.mockRestore();
      Object.defineProperty(Platform, 'OS', { configurable: true, value: realOS });
    });

    it('does not warn when text-decoration carries an explicit color (iOS honors the keys)', () => {
      expect(transformDecl('text-decoration', 'underline #f00')).toEqual({
        textDecorationLine: 'underline',
        textDecorationStyle: 'solid',
        textDecorationColor: '#f00',
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});

// https://drafts.csswg.org/css-color-5/#relative-colors
describe('relative-color spec compliance (CSS Color Module Level 5 §4)', () => {
  // The literal-base path folds at compile time via staticColorFunctionToHex.
  // Sentinel-base form (var() / theme tokens) bails with the warn.

  beforeEach(() => {
    resetWarningsForTest();
  });

  describe('§4.1 channel-keyword resolution', () => {
    // "All operations take part in the color space of the relative
    // color function; if the originally specified color space for the
    // origin color used a different color function, it's first
    // converted into the chosen color function, so it has meaningful
    // values for the components, and component keywords refer to the
    // color space of the relative color, not the origin color."
    it('oklch(from #f00 l c h) recomposes the origin (red) ≈ #ff0000', () => {
      const tok = tokenize('oklch(from #f00 l c h)')[0];
      const hex = staticColorFunctionToHex(tok);
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      const r = parseInt(hex!.slice(1, 3), 16);
      const g = parseInt(hex!.slice(3, 5), 16);
      const b = parseInt(hex!.slice(5, 7), 16);
      expect(r).toBeGreaterThan(0xf0);
      expect(g).toBeLessThan(0x20);
      expect(b).toBeLessThan(0x20);
    });

    it('oklab(from #00f l a b) recomposes the origin (blue) ≈ #0000ff', () => {
      const tok = tokenize('oklab(from #00f l a b)')[0];
      const hex = staticColorFunctionToHex(tok);
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      const r = parseInt(hex!.slice(1, 3), 16);
      const b = parseInt(hex!.slice(5, 7), 16);
      expect(r).toBeLessThan(0x20);
      expect(b).toBeGreaterThan(0xf0);
    });

    it('lch(from #0f0 l c h) recomposes the origin (green) ≈ #00ff00', () => {
      const tok = tokenize('lch(from #0f0 l c h)')[0];
      const hex = staticColorFunctionToHex(tok);
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      const g = parseInt(hex!.slice(3, 5), 16);
      expect(g).toBeGreaterThan(0xf0);
    });

    it('lab(from #fff l a b) recomposes white', () => {
      const tok = tokenize('lab(from #fff l a b)')[0];
      const hex = staticColorFunctionToHex(tok);
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      const r = parseInt(hex!.slice(1, 3), 16);
      const g = parseInt(hex!.slice(3, 5), 16);
      const b = parseInt(hex!.slice(5, 7), 16);
      expect(r).toBeGreaterThan(0xf0);
      expect(g).toBeGreaterThan(0xf0);
      expect(b).toBeGreaterThan(0xf0);
    });

    it('cross-space conversion: lab(from #ff0000 l a b) re-emits red', () => {
      // sRGB → CIELab → LabToRgb roundtrip preserves perceptual red.
      const tok = tokenize('lab(from #ff0000 l a b)')[0];
      const hex = staticColorFunctionToHex(tok);
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      const r = parseInt(hex!.slice(1, 3), 16);
      expect(r).toBeGreaterThan(0xf0);
    });

    it('keywords accepted in any slot order (oklch c l h is valid)', () => {
      // Swapping `l` and `c` produces a different color than the origin;
      // we just verify the parse succeeds rather than asserting a value.
      const tok = tokenize('oklch(from oklch(0.5 0.1 200) c l h)')[0];
      const hex = staticColorFunctionToHex(tok);
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('§4.1 alpha default = origin alpha', () => {
    // "If the alpha value of the relative color is omitted, it defaults
    // to that of the origin color (rather than defaulting to 100%, as
    // it does in the absolute syntax)."
    it('oklch with omitted alpha inherits the origin alpha', () => {
      // Origin is rgb(...,0.5); the relative color omits `/ alpha`.
      const tok = tokenize('oklch(from rgb(255 0 0 / 0.5) l c h)')[0];
      const hex = staticColorFunctionToHex(tok);
      // 8-digit hex with `80` alpha byte (0.5 × 255 ≈ 128).
      expect(hex).toMatch(/^#[0-9a-f]{6}80$/i);
    });

    it('explicit alpha overrides the origin alpha', () => {
      const tok = tokenize('oklch(from rgb(255 0 0 / 0.5) l c h / 1)')[0];
      const hex = staticColorFunctionToHex(tok);
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('§4.2 calc() with bound channel keywords', () => {
    // "By using the component keywords in a math function, an origin
    // color can be manipulated in more advanced ways."
    it('oklch(from #f00 calc(l - 0.2) c h) darkens red', () => {
      const tok = tokenize('oklch(from #f00 calc(l - 0.2) c h)')[0];
      const hex = staticColorFunctionToHex(tok);
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      // Darker than #f00.
      const r = parseInt(hex!.slice(1, 3), 16);
      expect(r).toBeLessThan(0xf0);
    });

    it('oklch(from #f00 l c calc(h + 90)) shifts hue', () => {
      const tok = tokenize('oklch(from #f00 l c calc(h + 90))')[0];
      const hex = staticColorFunctionToHex(tok);
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      expect(hex).not.toMatch(/^#ff/);
    });

    it('oklch(from #f00 l calc(c / 2) h) reduces chroma', () => {
      const tok = tokenize('oklch(from #f00 l calc(c / 2) h)')[0];
      const hex = staticColorFunctionToHex(tok);
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      // Halved chroma desaturates red toward gray; green/blue lift.
      const r = parseInt(hex!.slice(1, 3), 16);
      const g = parseInt(hex!.slice(3, 5), 16);
      expect(r).toBeLessThan(0xff);
      expect(g).toBeGreaterThan(0x20);
    });

    it('calc() composes channel keywords with literal numbers', () => {
      const tok = tokenize('oklch(from #f00 0.5 c h)')[0];
      const hex = staticColorFunctionToHex(tok);
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('§4 origin in nested color functions', () => {
    it('oklch(from rgb(255 0 0) l c h) accepts an rgb() origin', () => {
      const tok = tokenize('oklch(from rgb(255 0 0) l c h)')[0];
      const hex = staticColorFunctionToHex(tok);
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      const r = parseInt(hex!.slice(1, 3), 16);
      expect(r).toBeGreaterThan(0xf0);
    });

    it('oklch(from oklab(0.7 0.1 0.1) l c h) accepts an oklab() origin', () => {
      const tok = tokenize('oklch(from oklab(0.7 0.1 0.1) l c h)')[0];
      const hex = staticColorFunctionToHex(tok);
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('named-color origin: oklch(from blue l c h)', () => {
      const tok = tokenize('oklch(from blue l c h)')[0];
      const hex = staticColorFunctionToHex(tok);
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      const b = parseInt(hex!.slice(5, 7), 16);
      expect(b).toBeGreaterThan(0xc0);
    });

    // Spec verbatim: "The origin color can be any <color>, including
    // any of the color() function spaces." `color()` originates from
    // CSS Color 4 §10 (predefined RGB spaces); the relative-color
    // grammar in CSS Color 5 §4 doesn't restrict the origin.
    it('color(srgb 1 0 0) origin recomposes through OKLCh', () => {
      const tok = tokenize('oklch(from color(srgb 1 0 0) l c h)')[0];
      const hex = staticColorFunctionToHex(tok);
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      // sRGB red → roundtrip through OKLCh → red.
      const r = parseInt(hex!.slice(1, 3), 16);
      const g = parseInt(hex!.slice(3, 5), 16);
      const b = parseInt(hex!.slice(5, 7), 16);
      expect(r).toBeGreaterThan(0xf0);
      expect(g).toBeLessThan(0x20);
      expect(b).toBeLessThan(0x20);
    });

    it('color(display-p3 1 0 0) origin resolves (gamut-mapped to sRGB)', () => {
      // Display-P3 pure red is out-of-gamut for sRGB; the existing
      // finalizeOrMap routes through the OKLCh bisection mapper, so the
      // result is the closest in-gamut red, not a clip-floor.
      const tok = tokenize('oklch(from color(display-p3 1 0 0) l c h)')[0];
      const hex = staticColorFunctionToHex(tok);
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      const r = parseInt(hex!.slice(1, 3), 16);
      const g = parseInt(hex!.slice(3, 5), 16);
      const b = parseInt(hex!.slice(5, 7), 16);
      expect(r).toBeGreaterThan(0xd0);
      expect(g).toBeLessThan(0x40);
      expect(b).toBeLessThan(0x40);
    });

    it('legacy rgba() origin preserves alpha through the relative fold', () => {
      // CSS Color 5 §4.1: "If the alpha value of the relative color is
      // omitted, it defaults to that of the origin color (rather than
      // defaulting to 100%, as it does in the absolute syntax)." Legacy
      // comma form should round-trip identically to slash form.
      const tok = tokenize('oklch(from rgba(255, 0, 0, 0.5) l c h)')[0];
      const hex = staticColorFunctionToHex(tok);
      expect(hex).toMatch(/^#[0-9a-f]{6}80$/i);
    });
  });

  describe('§4 `none` channel substitution in relative-color (Color 4 §4.4)', () => {
    // CSS Color 4 §4.4: "If the value of a channel is the keyword
    // `none`, the channel is given a used value of zero for the purpose
    // of interpolation, compositing, and serialization." Relative-color
    // syntax inherits the same substitution rule for any channel slot.
    it('oklch(from #f00 none c h) substitutes L=0 (black with red chroma direction)', () => {
      const tok = tokenize('oklch(from #f00 none c h)')[0];
      const hex = staticColorFunctionToHex(tok);
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      // L=0 forces the color to black regardless of chroma / hue.
      expect(hex).toBe('#000000');
    });
  });

  describe('§4.1 alpha clamp (Color 5 §4.1)', () => {
    // CSS Color 5 §4.1 inherits alpha clamping from Color 4 §1.4: "The
    // alpha value is clamped to the range [0,1]." A `calc()` that
    // overshoots must clamp at the used-value step rather than emit a
    // raw 2.0 alpha.
    it('oklch(from #f00 l c h / calc(alpha * 2)) clamps alpha to 1 (no alpha byte)', () => {
      const tok = tokenize('oklch(from #f00 l c h / calc(alpha * 2))')[0];
      const hex = staticColorFunctionToHex(tok);
      // Origin alpha is 1; doubling clamps to 1; fully opaque, 6-digit
      // hex (no alpha byte appended).
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('§4 currentColor origin requires the cascade', () => {
    // CSS Color 5 §4: "The origin color can be any <color>." But
    // `currentColor` resolves at used-value time against the cascaded
    // `color` value, which the static fold can't see on native. We
    // warn once and drop the declaration so the author chooses a
    // theme-token base or pre-resolves the value.
    it('oklch(from currentColor l c h) drops the declaration', () => {
      const tok = tokenize('oklch(from currentColor l c h)')[0];
      const hex = staticColorFunctionToHex(tok);
      expect(hex).toBeNull();
    });

    it('emits warnOnce naming the offending construct and an alternative', () => {
      resetWarningsForTest();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        const tok = tokenize('oklch(from currentColor l c h)')[0];
        staticColorFunctionToHex(tok);
        expect(warnSpy).toHaveBeenCalledTimes(1);
        const message = (warnSpy.mock.calls[0] as string[])[0];
        expect(message).toContain('currentColor');
        expect(message).toContain('oklch(from currentColor');
        expect(message).toContain('theme value');
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('mixed-case currentColor matches (ASCII case-insensitive ident)', () => {
      resetWarningsForTest();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        const tok = tokenize('oklch(from CURRENTCOLOR l c h)')[0];
        const hex = staticColorFunctionToHex(tok);
        expect(hex).toBeNull();
        expect(warnSpy).toHaveBeenCalledTimes(1);
      } finally {
        warnSpy.mockRestore();
      }
    });
  });

  describe('§4.1 sentinel-base (theme-token) defers to runtime resolver', () => {
    // The static fold bails (returns null) so transformDecl's
    // dispatch falls into buildResolver → colorFnResolver, which at
    // render time substitutes the sentinel with the resolved theme
    // value and re-enters the fold pipeline. No warning fires.
    it('staticColorFunctionToHex returns null for sentinel-base values', () => {
      const tok = tokenize('oklch(from \0sc:colors.brand:#f00 l c h)')[0];
      const hex = staticColorFunctionToHex(tok);
      expect(hex).toBeNull();
    });

    it('no warning fires; the runtime resolver handles substitution', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        const tok = tokenize('oklch(from \0sc:colors.brand:#f00 l c h)')[0];
        staticColorFunctionToHex(tok);
        expect(warnSpy).not.toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('buildResolver returns a resolver that substitutes + folds at render time', () => {
      const r = buildResolver('oklch(from \0sc:colors.brand:#f00 l c h)');
      expect(r).not.toBeNull();
      // Theme path resolved at render time; the resolver substitutes
      // the sentinel with the theme value, then folds the relative
      // color against the resolved base.
      const env = {
        media: {
          width: 0,
          height: 0,
          colorScheme: null,
          reduceMotion: false,
          fontScale: 1,
          pixelRatio: 1,
        },
        container: null,
        theme: { colors: { brand: '#00ff00' } },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
        rootFontSize: 16,
        fontSize: 16,
        lineHeight: 24,
        direction: 'ltr' as const,
      };
      const out = r!(env);
      expect(typeof out).toBe('string');
      expect(out as string).toMatch(/^#[0-9a-f]{6}$/);
      // The resolved hex should be the brand color (green) recomposed
      // through OKLCh; bytes close to #00ff00.
      const g = parseInt((out as string).slice(3, 5), 16);
      expect(g).toBeGreaterThan(0xf0);
    });

    it('relative color with calc() against sentinel base resolves', () => {
      const r = buildResolver('oklch(from \0sc:colors.brand:#0066cc calc(l - 0.15) c h)');
      expect(r).not.toBeNull();
      const env = {
        media: {
          width: 0,
          height: 0,
          colorScheme: null,
          reduceMotion: false,
          fontScale: 1,
          pixelRatio: 1,
        },
        container: null,
        theme: { colors: { brand: '#3399ff' } },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
        rootFontSize: 16,
        fontSize: 16,
        lineHeight: 24,
        direction: 'ltr' as const,
      };
      const out = r!(env);
      expect(typeof out).toBe('string');
      expect(out as string).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('§4.1 percentage and angle origins resolve to numbers', () => {
    // "If the origin color has a hue <angle> specified in degrees, then
    // RCS in the same colorspace will use the resolved <number> form."
    it('hue from origin angle resolves to a number for use in calc()', () => {
      const tok = tokenize('oklch(from oklch(0.5 0.1 90deg) l c calc(h + 10))')[0];
      const hex = staticColorFunctionToHex(tok);
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describeOnRnWeb(() => {
    it('parity: literal-base oklch(from #f00 l c h) still folds', () => {
      const tok = tokenize('oklch(from #f00 l c h)')[0];
      expect(staticColorFunctionToHex(tok)).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('browser resolves currentColor branch; polyfill skips native warn', () => {
      resetWarningsForTest();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        const tok = tokenize('oklch(from currentColor l c h)')[0];
        expect(staticColorFunctionToHex(tok)).toBeNull();
        expect(warnSpy).not.toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
      }
    });
  });
});

// https://drafts.csswg.org/css-color-4/#css-system-colors
describe('system color spec compliance (CSS Color Module Level 4 §6.2)', () => {
  // "Each system color value resolves to a UA / platform-defined
  // color appropriate to the platform." v7 folds the keyword to an
  // opaque React Native PlatformColor object on iOS / Android and
  // passes the keyword through on rn-web.

  describe('§6.2 keyword set', () => {
    // "User agents must support the following keywords": Canvas,
    // CanvasText, LinkText, VisitedText, ActiveText, ButtonFace,
    // ButtonText, ButtonBorder, Field, FieldText, GrayText,
    // SelectedItem, SelectedItemText, Mark, MarkText, Highlight,
    // HighlightText, AccentColor, AccentColorText (19 total).
    const KEYWORDS = [
      'Canvas',
      'CanvasText',
      'Field',
      'FieldText',
      'GrayText',
      'Highlight',
      'HighlightText',
      'LinkText',
      'VisitedText',
      'ActiveText',
      'ButtonFace',
      'ButtonText',
      'ButtonBorder',
      'SelectedItem',
      'SelectedItemText',
      'Mark',
      'MarkText',
      'AccentColor',
      'AccentColorText',
    ];

    it.each(KEYWORDS)('%s folds to a native color value', keyword => {
      const out = transformDecl('color', keyword);
      // Native (jest default): PlatformColor resolves through the iOS
      // semantic-color object shape. Selection foregrounds stay
      // color-mode aware because native highlight / selection colors
      // are not guaranteed to be a solid accent color.
      if (keyword === 'HighlightText') {
        expect(out.color).toBe('light-dark(#000000, #ffffff)');
      } else if (keyword === 'SelectedItemText' || keyword === 'AccentColorText') {
        expect(out.color).toBe('#ffffff');
      } else if (keyword === 'MarkText') {
        expect(out.color).toBe('#000000');
      } else {
        expect(out.color).toEqual({
          semantic: expect.any(Array),
        });
      }
    });

    it('matches case-insensitively per CSS syntax §3.4', () => {
      const lower = transformDecl('color', 'canvas');
      const mixed = transformDecl('color', 'Canvas');
      const upper = transformDecl('color', 'CANVAS');
      expect(lower.color).toEqual(mixed.color);
      expect(mixed.color).toEqual(upper.color);
    });

    it('ButtonFace folds to native button-surface colors', () => {
      const out = transformDecl('color', 'ButtonFace');
      expect(out.color).toEqual({
        semantic: expect.arrayContaining(['systemFill', '?attr/colorButtonNormal']),
      });
    });

    it('AccentColor folds to native accent colors', () => {
      const out = transformDecl('color', 'AccentColor');
      expect(out.color).toEqual({
        semantic: expect.arrayContaining(['systemBlue', '?attr/colorAccent']),
      });
    });

    it('Mark folds to native highlight colors', () => {
      const out = transformDecl('color', 'Mark');
      expect(out.color).toEqual({
        semantic: expect.arrayContaining(['systemYellow', '@android:color/holo_orange_light']),
      });
    });

    it('ButtonFace mixed-case input (buttonface / BUTTONFACE / ButtonFace) all match', () => {
      // CSS syntax §3.4: identifiers are ASCII case-insensitive.
      const lower = transformDecl('color', 'buttonface');
      const upper = transformDecl('color', 'BUTTONFACE');
      const mixed = transformDecl('color', 'ButtonFace');
      expect(lower.color).toEqual(mixed.color);
      expect(mixed.color).toEqual(upper.color);
    });
  });

  describe('CSS Color 4 Appendix A deprecated aliases', () => {
    // Spec verbatim: "User agents must support these keywords, and to
    // mitigate fingerprinting must map them to the (undeprecated)
    // system colors."

    it.each([
      ['ActiveBorder', 'ButtonBorder'],
      ['ActiveCaption', 'CanvasText'],
      ['AppWorkspace', 'Canvas'],
      ['Background', 'Canvas'],
      ['ButtonHighlight', 'ButtonFace'],
      ['ButtonShadow', 'ButtonFace'],
      ['CaptionText', 'CanvasText'],
      ['InactiveBorder', 'ButtonBorder'],
      ['InactiveCaption', 'Canvas'],
      ['InactiveCaptionText', 'GrayText'],
      ['InfoBackground', 'Canvas'],
      ['InfoText', 'CanvasText'],
      ['Menu', 'Canvas'],
      ['MenuText', 'CanvasText'],
      ['Scrollbar', 'Canvas'],
      ['ThreeDDarkShadow', 'ButtonBorder'],
      ['ThreeDFace', 'ButtonFace'],
      ['ThreeDHighlight', 'ButtonBorder'],
      ['ThreeDLightShadow', 'ButtonBorder'],
      ['ThreeDShadow', 'ButtonBorder'],
      ['Window', 'Canvas'],
      ['WindowFrame', 'ButtonBorder'],
      ['WindowText', 'CanvasText'],
    ])('%s resolves to %s', (deprecated, replacement) => {
      const dep = transformDecl('color', deprecated);
      const repl = transformDecl('color', replacement);
      expect(dep.color).toEqual(repl.color);
    });

    it('deprecated alias matches case-insensitively', () => {
      const lower = transformDecl('color', 'activeborder');
      const upper = transformDecl('color', 'ACTIVEBORDER');
      const mixed = transformDecl('color', 'ActiveBorder');
      expect(lower.color).toEqual(mixed.color);
      expect(mixed.color).toEqual(upper.color);
    });
  });

  describe('§6.2 currentColor is not eaten by the polyfill', () => {
    // `currentColor` is a <color> keyword, not a system color. The
    // polyfill must return null so the declaration passes through to
    // the existing coerce path (where rn-web preserves the keyword and
    // native lets it propagate to RN's color parser).
    it('color: currentColor passes through unchanged', () => {
      const out = transformDecl('color', 'currentColor');
      expect(out.color).toBe('currentColor');
    });
  });

  describe('§6.2 prop-context coverage', () => {
    // System colors apply on any color-accepting property.
    it('background-color: Canvas folds', () => {
      const out = transformDecl('background-color', 'Canvas');
      expect(out.backgroundColor).toEqual({
        semantic: expect.arrayContaining(['systemBackground']),
      });
    });

    it('border-color: GrayText folds', () => {
      const out = transformDecl('border-color', 'GrayText');
      expect(out.borderColor).toEqual({
        semantic: expect.arrayContaining(['secondaryLabel']),
      });
    });

    it('caret-color: Highlight folds', () => {
      const out = transformDecl('caret-color', 'Highlight');
      expect(out.caretColor).toEqual({
        semantic: expect.arrayContaining(['quaternarySystemFill', '?attr/colorControlHighlight']),
      });
    });
  });

  describe('§6.2 composite shorthands fold system keywords on native', () => {
    it('border: width style + Canvas folds borderColor', () => {
      expect(transformDecl('border', '1px solid Canvas')).toEqual({
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: expect.objectContaining({
          semantic: expect.arrayContaining(['systemBackground']),
        }),
      });
    });

    it('border: style + deprecated Window alias folds like Canvas', () => {
      expect(transformDecl('border', 'solid Window')).toEqual({
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: expect.objectContaining({
          semantic: expect.arrayContaining(['systemBackground']),
        }),
      });
    });

    it('outline: width style + Highlight folds outlineColor', () => {
      expect(transformDecl('outline', '2px solid Highlight')).toEqual({
        outlineWidth: 2,
        outlineStyle: 'solid',
        outlineColor: expect.objectContaining({
          semantic: expect.arrayContaining(['quaternarySystemFill', '?attr/colorControlHighlight']),
        }),
      });
    });

    it('background: Canvas (color-only layer) folds backgroundColor', () => {
      expect(transformDecl('background', 'Canvas')).toEqual({
        backgroundColor: expect.objectContaining({
          semantic: expect.arrayContaining(['systemBackground']),
        }),
      });
    });

    it('background: image layer + final Canvas folds backgroundColor', () => {
      const out = transformDecl('background', 'linear-gradient(to right, red, blue) Canvas');
      expect(out.backgroundColor).toEqual(
        expect.objectContaining({
          semantic: expect.arrayContaining(['systemBackground']),
        })
      );
      expect(out.backgroundImage).toContain('linear-gradient');
    });

    it('text-decoration: underline + Canvas folds textDecorationColor', () => {
      expect(transformDecl('text-decoration', 'underline Canvas')).toEqual({
        textDecorationLine: 'underline',
        textDecorationStyle: 'solid',
        textDecorationColor: expect.objectContaining({
          semantic: expect.arrayContaining(['systemBackground']),
        }),
      });
    });

    it('text-shadow: offsets + Highlight folds textShadowColor', () => {
      expect(transformDecl('text-shadow', '1px 2px Highlight')).toEqual({
        textShadowOffset: { width: 1, height: 2 },
        textShadowRadius: 0,
        textShadowColor: expect.objectContaining({
          semantic: expect.arrayContaining(['quaternarySystemFill', '?attr/colorControlHighlight']),
        }),
      });
    });

    it('border-color: two values expands with folded system keyword', () => {
      expect(transformDecl('border-color', 'red Highlight')).toEqual({
        borderTopColor: 'red',
        borderRightColor: expect.objectContaining({
          semantic: expect.arrayContaining(['quaternarySystemFill', '?attr/colorControlHighlight']),
        }),
        borderBottomColor: 'red',
        borderLeftColor: expect.objectContaining({
          semantic: expect.arrayContaining(['quaternarySystemFill', '?attr/colorControlHighlight']),
        }),
      });
    });

    // CSS Color 4 §6.2 system color keywords appearing as `linear-gradient`
    // color stops fail RN's string-form `processColor` probe. Native must
    // expand the gradient to RN's array form so each stop carries a folded
    // PlatformColor object. rn-web keeps the string for the browser.
    it('background-image: linear-gradient with system-color stop expands to array form', () => {
      const out = transformDecl('background-image', 'linear-gradient(red, Canvas)');
      expect(Array.isArray(out.experimental_backgroundImage)).toBe(true);
      const [gradient] = out.experimental_backgroundImage as Array<Record<string, unknown>>;
      expect(gradient.type).toBe('linear-gradient');
      const stops = gradient.colorStops as Array<Record<string, unknown>>;
      expect(stops).toHaveLength(2);
      expect(stops[0].color).toBe('red');
      expect(stops[1].color).toEqual(
        expect.objectContaining({
          semantic: expect.arrayContaining(['systemBackground']),
        })
      );
      // The rn-web key keeps the raw string (browser handles natively).
      expect(out.backgroundImage).toBe('linear-gradient(red, Canvas)');
    });

    it('background-image: pure named-color gradient stays as a string (no array allocation)', () => {
      const out = transformDecl('background-image', 'linear-gradient(red, blue)');
      expect(out.experimental_backgroundImage).toBe('linear-gradient(red, blue)');
      expect(out.backgroundImage).toBe('linear-gradient(red, blue)');
    });

    it('background shorthand: gradient stop with system color expands the native image array', () => {
      const out = transformDecl('background', 'linear-gradient(to right, Canvas, red)');
      expect(Array.isArray(out.experimental_backgroundImage)).toBe(true);
      const [gradient] = out.experimental_backgroundImage as Array<Record<string, unknown>>;
      const stops = gradient.colorStops as Array<Record<string, unknown>>;
      expect(stops[0].color).toEqual(
        expect.objectContaining({
          semantic: expect.arrayContaining(['systemBackground']),
        })
      );
      expect(stops[1].color).toBe('red');
    });
  });

  describe('§6.2 platform-color reactivity', () => {
    // System colors respond to the platform's active appearance and
    // accessibility settings through RN's native PlatformColor surface.
    it('Canvas uses the native background semantic color', () => {
      const out = transformDecl('color', 'Canvas');
      expect(out.color).toEqual({
        semantic: expect.arrayContaining(['systemBackground']),
      });
    });

    it('CanvasText uses the native foreground semantic color', () => {
      const out = transformDecl('color', 'CanvasText');
      expect(out.color).toEqual({
        semantic: expect.arrayContaining(['label']),
      });
    });

    it('LinkText uses the native link semantic color', () => {
      const out = transformDecl('color', 'LinkText');
      expect(out.color).toEqual({
        semantic: expect.arrayContaining(['link']),
      });
    });

    it('HighlightText remains color-mode aware over the native highlight color', () => {
      const out = transformDecl('color', 'HighlightText');
      expect(out.color).toBe('light-dark(#000000, #ffffff)');
    });

    it('SelectedItem prefers an iOS AccentColor asset before system fallback colors', () => {
      const out = transformDecl('color', 'SelectedItem');
      expect(out.color).toEqual({
        semantic: expect.arrayContaining([
          'AccentColor',
          'systemBlue',
          '?attr/colorActivatedHighlight',
        ]),
      });
    });

    it('SelectedItemText and MarkText use fixed foregrounds for their paired surfaces', () => {
      expect(transformDecl('color', 'SelectedItemText').color).toBe('#ffffff');
      expect(transformDecl('color', 'MarkText').color).toBe('#000000');
    });

    describe('on Android', () => {
      const realOS = Platform.OS;
      beforeAll(() => {
        Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
      });
      afterAll(() => {
        Object.defineProperty(Platform, 'OS', { configurable: true, value: realOS });
      });

      it('uses the Android-only GrayText light-dark fallback', () => {
        expect(transformDecl('color', 'GrayText').color).toBe('light-dark(#6e6e6e, #8e8e93)');
      });

      it('uses Android platform foreground resources for selected and marked text', () => {
        expect(transformDecl('color', 'SelectedItemText').color).toEqual({
          semantic: expect.arrayContaining(['?attr/colorForeground', '@android:color/black']),
        });
        expect(transformDecl('color', 'MarkText').color).toEqual({
          semantic: expect.arrayContaining(['@android:color/black']),
        });
      });
    });
  });

  describe('§6.2 non-keyword passthrough (no regressions)', () => {
    // Bare keywords that are NOT system colors (e.g. `auto`) must
    // continue to flow through unchanged.
    it('bare `auto` is not rewritten', () => {
      // `auto` was previously the unit fallback in coerceRawValue;
      // the system-color check must not steal it.
      expect(transformDecl('aspect-ratio', 'auto')).toEqual({ aspectRatio: 'auto' });
    });

    it('named CSS colors (`red`) pass through to the color parser', () => {
      const out = transformDecl('color', 'red');
      // `red` is not a system color; the existing NAMED_TO_RGB
      // path or coerce returns it untouched.
      expect(out.color).toBe('red');
    });
  });

  // Modern browsers track the user's actual system theme, forced-colors
  // mode, and high-contrast settings when resolving CSS Color 4 system
  // keywords (CSS Color 4 §6.2). On rn-web we skip the expansion so the
  // browser does the right thing end-to-end.
  describeOnRnWeb(() => {
    it('passes Canvas through unchanged so the browser tracks the system theme', () => {
      expect(transformDecl('color', 'Canvas')).toEqual({ color: 'Canvas' });
    });

    it('passes deprecated keywords through unchanged (browser handles the alias)', () => {
      expect(transformDecl('color', 'WindowText')).toEqual({ color: 'WindowText' });
    });

    it('composite shorthands keep system keywords as authored CSS strings', () => {
      expect(transformDecl('border', '1px solid Canvas')).toEqual({
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'Canvas',
      });
      expect(transformDecl('outline', '2px solid Highlight')).toEqual({
        outlineWidth: 2,
        outlineStyle: 'solid',
        outlineColor: 'Highlight',
      });
      expect(transformDecl('background', 'Canvas')).toEqual({ backgroundColor: 'Canvas' });
      expect(
        transformDecl('background', 'linear-gradient(to right, red, blue) Canvas')
      ).toMatchObject({
        backgroundColor: 'Canvas',
        backgroundImage: expect.stringContaining('linear-gradient'),
      });
      expect(transformDecl('text-decoration', 'underline Canvas')).toEqual({
        textDecorationLine: 'underline',
        textDecorationStyle: 'solid',
        textDecorationColor: 'Canvas',
      });
      expect(transformDecl('text-shadow', '1px 2px Highlight')).toEqual({
        textShadowOffset: { width: 1, height: 2 },
        textShadowRadius: 0,
        textShadowColor: 'Highlight',
      });
      expect(transformDecl('border-color', 'red Highlight')).toEqual({
        borderTopColor: 'red',
        borderRightColor: 'Highlight',
        borderBottomColor: 'red',
        borderLeftColor: 'Highlight',
      });
    });

    it('background-image with system-color gradient stop passes through unchanged', () => {
      expect(transformDecl('background-image', 'linear-gradient(red, Canvas)')).toEqual({
        experimental_backgroundImage: 'linear-gradient(red, Canvas)',
        backgroundImage: 'linear-gradient(red, Canvas)',
      });
    });
  });
});

describe('logical border spec compliance (CSS Logical Properties Level 1 §4.5)', () => {
  // Spec source: https://drafts.csswg.org/css-logical-1/#border-properties
  // Polyfill scope on RN under horizontal-tb (Yoga's only writing mode):
  //   inline-start → borderStart*, inline-end → borderEnd*
  //   block-start  → borderTop*,   block-end  → borderBottom*
  // RN 0.85 exposes no per-edge borderStyle, so per-edge style declarations
  // drop on iOS / Android with a warnOnce. rn-web honors the per-edge form
  // via the browser; the polyfill emits camelCase border*Style keys.

  beforeEach(() => {
    resetWarningsForTest();
  });

  describe('§4.5 single-edge color longhands', () => {
    it('border-inline-start-color → borderStartColor', () => {
      expect(transformDecl('border-inline-start-color', 'red')).toEqual({
        borderStartColor: 'red',
      });
    });

    it('border-inline-end-color → borderEndColor', () => {
      expect(transformDecl('border-inline-end-color', '#abc')).toEqual({
        borderEndColor: '#abc',
      });
    });

    it('border-block-start-color → borderTopColor', () => {
      expect(transformDecl('border-block-start-color', 'rgb(10, 20, 30)')).toEqual({
        borderTopColor: 'rgb(10, 20, 30)',
      });
    });

    it('border-block-end-color → borderBottomColor', () => {
      expect(transformDecl('border-block-end-color', 'blue')).toEqual({
        borderBottomColor: 'blue',
      });
    });

    it('invalid color value drops the declaration', () => {
      // No tokens that parse as a color.
      expect(transformDecl('border-inline-start-color', '5px solid')).toEqual({});
    });
  });

  describe('§4.5 single-edge width longhands', () => {
    it('border-inline-start-width → borderStartWidth (numeric)', () => {
      expect(transformDecl('border-inline-start-width', '2px')).toEqual({ borderStartWidth: 2 });
    });

    it('border-inline-end-width keeps unitless 0', () => {
      expect(transformDecl('border-inline-end-width', '0')).toEqual({ borderEndWidth: 0 });
    });

    it('border-block-start-width → borderTopWidth', () => {
      expect(transformDecl('border-block-start-width', '4px')).toEqual({ borderTopWidth: 4 });
    });

    it('border-block-end-width → borderBottomWidth', () => {
      expect(transformDecl('border-block-end-width', '6px')).toEqual({ borderBottomWidth: 6 });
    });
  });

  describe('§4.5 single-edge style longhands', () => {
    it('accepts the four RN-renderable styles (solid / dotted / dashed / none)', () => {
      // RN exposes no per-edge `borderStyle`; the polyfill drops on native.
      // We assert the empty result; warnOnce content is covered separately.
      expect(transformDecl('border-inline-start-style', 'solid')).toEqual({});
      expect(transformDecl('border-inline-end-style', 'dotted')).toEqual({});
      expect(transformDecl('border-block-start-style', 'dashed')).toEqual({});
      expect(transformDecl('border-block-end-style', 'none')).toEqual({});
    });

    it('rejects unknown style keywords', () => {
      expect(transformDecl('border-inline-start-style', 'wavy')).toEqual({});
    });

    // CSS Backgrounds 3 §3.2: "<line-style> = none | hidden | dotted |
    // dashed | solid | double | groove | ridge | inset | outset"
    it('accepts valid CSS line styles that native cannot draw, then drops with the per-edge warning', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        expect(transformDecl('border-inline-start-style', 'double')).toEqual({});
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toMatch(/border-inline-start-style: double/);
      } finally {
        warnSpy.mockRestore();
      }
    });
  });

  describe('§4.5 axis color shorthand', () => {
    it('single value applies to both edges of the axis', () => {
      expect(transformDecl('border-inline-color', 'red')).toEqual({
        borderStartColor: 'red',
        borderEndColor: 'red',
      });
    });

    it('two values: start then end', () => {
      expect(transformDecl('border-inline-color', 'red blue')).toEqual({
        borderStartColor: 'red',
        borderEndColor: 'blue',
      });
    });

    it('border-block-color two values map to top / bottom', () => {
      expect(transformDecl('border-block-color', 'red blue')).toEqual({
        borderTopColor: 'red',
        borderBottomColor: 'blue',
      });
    });
  });

  describe('§4.5 axis width shorthand', () => {
    it('single value applies to both axis edges', () => {
      expect(transformDecl('border-inline-width', '3px')).toEqual({
        borderStartWidth: 3,
        borderEndWidth: 3,
      });
    });

    it('two values: start then end', () => {
      expect(transformDecl('border-inline-width', '2px 4px')).toEqual({
        borderStartWidth: 2,
        borderEndWidth: 4,
      });
    });

    it('border-block-width: 2 values map to top / bottom', () => {
      expect(transformDecl('border-block-width', '2px 4px')).toEqual({
        borderTopWidth: 2,
        borderBottomWidth: 4,
      });
    });
  });

  describe('§4.5 axis style shorthand', () => {
    it('drops on native (no per-edge styles)', () => {
      expect(transformDecl('border-inline-style', 'solid dashed')).toEqual({});
      expect(transformDecl('border-block-style', 'solid')).toEqual({});
    });

    it('rejects mixed-validity styles', () => {
      expect(transformDecl('border-inline-style', 'solid wavy')).toEqual({});
    });
  });

  describe('§4.5 composite single-edge shorthand', () => {
    it('parses width + style + color in any order', () => {
      expect(transformDecl('border-inline-start', '2px solid red')).toEqual({
        borderStartWidth: 2,
        borderStartColor: 'red',
      });
      expect(transformDecl('border-inline-end', 'red 2px solid')).toEqual({
        borderEndWidth: 2,
        borderEndColor: 'red',
      });
    });

    it('width-only shorthand', () => {
      expect(transformDecl('border-block-start', '4px')).toEqual({ borderTopWidth: 4 });
    });

    it('color-only shorthand', () => {
      expect(transformDecl('border-block-end', 'blue')).toEqual({ borderBottomColor: 'blue' });
    });

    it('empty declaration drops to null', () => {
      expect(transformDecl('border-inline-start', '')).toEqual({});
    });

    it('duplicate styles bail', () => {
      // Two style tokens: invalid per parsing.
      expect(transformDecl('border-inline-start', 'solid dashed')).toEqual({});
    });
  });

  describe('§4.5 mode-spanning axis shorthand', () => {
    it('border-inline expands to start + end (width + color)', () => {
      expect(transformDecl('border-inline', '2px solid red')).toEqual({
        borderStartWidth: 2,
        borderEndWidth: 2,
        borderStartColor: 'red',
        borderEndColor: 'red',
      });
    });

    it('border-block expands to top + bottom', () => {
      expect(transformDecl('border-block', '3px solid blue')).toEqual({
        borderTopWidth: 3,
        borderBottomWidth: 3,
        borderTopColor: 'blue',
        borderBottomColor: 'blue',
      });
    });

    it('width-only mode-spanning', () => {
      expect(transformDecl('border-inline', '2px')).toEqual({
        borderStartWidth: 2,
        borderEndWidth: 2,
      });
    });
  });

  // CSS UI 4 §3.3: `outline-style: hidden` is invalid per spec (the
  // `hidden` keyword only applies to `border-style`, not outline). The
  // polyfill drops + warns. Other web-only outline styles pass through
  // with a warning so rn-web still gets the value.
  describe('CSS UI 4 §3.3 outline-style', () => {
    it('renderable styles pass through unchanged (solid / dotted / dashed)', () => {
      expect(transformDecl('outline-style', 'solid')).toEqual({ outlineStyle: 'solid' });
      expect(transformDecl('outline-style', 'dotted')).toEqual({ outlineStyle: 'dotted' });
      expect(transformDecl('outline-style', 'dashed')).toEqual({ outlineStyle: 'dashed' });
    });

    it('hidden drops to {} (invalid for outline per CSS UI 4 §3.3)', () => {
      expect(transformDecl('outline-style', 'hidden')).toEqual({});
    });

    it('web-only styles still emit so rn-web honors them', () => {
      expect(transformDecl('outline-style', 'double')).toEqual({ outlineStyle: 'double' });
      expect(transformDecl('outline-style', 'groove')).toEqual({ outlineStyle: 'groove' });
      expect(transformDecl('outline-style', 'auto')).toEqual({ outlineStyle: 'auto' });
    });

    it('none maps to solid + zero width (renderable equivalent)', () => {
      expect(transformDecl('outline-style', 'none')).toEqual({
        outlineStyle: 'solid',
        outlineWidth: 0,
      });
    });

    it('unknown keyword bails', () => {
      expect(transformDecl('outline-style', 'whatever')).toEqual({});
    });
  });

  describeOnRnWeb(() => {
    it('single-edge style emits border<Edge>Style for the browser', () => {
      expect(transformDecl('border-inline-start-style', 'solid')).toEqual({
        borderInlineStartStyle: 'solid',
      });
      expect(transformDecl('border-block-end-style', 'dashed')).toEqual({
        borderBlockEndStyle: 'dashed',
      });
    });

    it('single-edge style preserves valid browser-only line styles', () => {
      expect(transformDecl('border-inline-start-style', 'double')).toEqual({
        borderInlineStartStyle: 'double',
      });
      expect(transformDecl('border-block-end-style', 'hidden')).toEqual({
        borderBlockEndStyle: 'hidden',
      });
    });

    it('axis style emits both edges', () => {
      expect(transformDecl('border-inline-style', 'solid dashed')).toEqual({
        borderInlineStartStyle: 'solid',
        borderInlineEndStyle: 'dashed',
      });
    });

    it('axis style preserves valid browser-only line styles', () => {
      expect(transformDecl('border-block-style', 'groove outset')).toEqual({
        borderBlockStartStyle: 'groove',
        borderBlockEndStyle: 'outset',
      });
    });

    it('composite shorthand emits per-edge style', () => {
      expect(transformDecl('border-inline-start', '2px solid red')).toEqual({
        borderStartWidth: 2,
        borderStartColor: 'red',
        borderInlineStartStyle: 'solid',
      });
    });

    it('mode-spanning shorthand emits per-edge style on both ends', () => {
      expect(transformDecl('border-inline', '2px solid red')).toEqual({
        borderStartWidth: 2,
        borderEndWidth: 2,
        borderStartColor: 'red',
        borderEndColor: 'red',
        borderInlineStartStyle: 'solid',
        borderInlineEndStyle: 'solid',
      });
    });
  });
});

describe('generic font-family resolution (CSS Fonts 4 §3.1.1)', () => {
  // Spec source: https://drafts.csswg.org/css-fonts-4/#generic-family-name-syntax
  // Polyfill scope: detect CSS generic family keywords and route each to
  // a concrete platform face. Detection is ASCII-case-insensitive.
  beforeEach(() => {
    __resetGenericFamilyCacheForTest();
  });

  describe('isGenericFamily', () => {
    it('recognizes all 13 CSS generic family keywords', () => {
      // CSS Fonts 4 §3.1.1: the spec-defined generic family identifiers.
      const keywords = [
        'system-ui',
        'ui-sans-serif',
        'ui-serif',
        'ui-monospace',
        'ui-rounded',
        'sans-serif',
        'serif',
        'monospace',
        'cursive',
        'fantasy',
        'emoji',
        'math',
        'fangsong',
      ];
      for (const kw of keywords) {
        expect(isGenericFamily(kw)).toBe(true);
      }
    });

    it('matches case-insensitively (CSS Fonts 4 §3.1.1)', () => {
      expect(isGenericFamily('System-UI')).toBe(true);
      expect(isGenericFamily('SERIF')).toBe(true);
      expect(isGenericFamily('Sans-Serif')).toBe(true);
    });

    it('rejects concrete face names and unknown keywords', () => {
      expect(isGenericFamily('Helvetica')).toBe(false);
      expect(isGenericFamily('Arial')).toBe(false);
      expect(isGenericFamily('')).toBe(false);
      expect(isGenericFamily('inherit')).toBe(false);
    });
  });

  describe('resolveGenericFamily under jest (Platform.OS = ios)', () => {
    // jest.config.native.js uses the react-native preset which sets Platform.OS
    // to 'ios' by default. Verify the iOS table maps correctly.
    it('system-ui / ui-sans-serif / sans-serif map to System', () => {
      expect(resolveGenericFamily('system-ui')).toBe('System');
      expect(resolveGenericFamily('ui-sans-serif')).toBe('System');
      expect(resolveGenericFamily('sans-serif')).toBe('System');
    });

    it('serif / ui-serif map to Times New Roman', () => {
      expect(resolveGenericFamily('serif')).toBe('Times New Roman');
      expect(resolveGenericFamily('ui-serif')).toBe('Times New Roman');
    });

    it('monospace / ui-monospace map to Menlo', () => {
      expect(resolveGenericFamily('monospace')).toBe('Menlo');
      expect(resolveGenericFamily('ui-monospace')).toBe('Menlo');
    });

    it('ui-rounded maps to SF Pro Rounded', () => {
      expect(resolveGenericFamily('ui-rounded')).toBe('SF Pro Rounded');
    });

    it('cursive / fantasy / emoji / math / fangsong have iOS-specific picks', () => {
      expect(resolveGenericFamily('cursive')).toBe('Snell Roundhand');
      expect(resolveGenericFamily('fantasy')).toBe('Papyrus');
      expect(resolveGenericFamily('emoji')).toBe('Apple Color Emoji');
      expect(resolveGenericFamily('math')).toBe('System');
      expect(resolveGenericFamily('fangsong')).toBe('PingFang SC');
    });

    it('lowercases the input before lookup (matches isGenericFamily)', () => {
      expect(resolveGenericFamily('System-UI')).toBe('System');
      expect(resolveGenericFamily('SERIF')).toBe('Times New Roman');
    });

    it('returns the input unchanged for unknown keywords (defensive)', () => {
      expect(resolveGenericFamily('Helvetica')).toBe('Helvetica');
    });
  });

  describeOnRnWeb(() => {
    // On rn-web the browser owns generic-family resolution; the native
    // resolver short-circuits via `__NATIVE_WEB__` in font.ts so the
    // keyword reaches the browser unchanged.
    it('font-family: serif passes the keyword through to the browser', () => {
      expect(transformDecl('font-family', 'serif')).toEqual({ fontFamily: 'serif' });
    });

    it('comma-separated fallback list survives intact on rn-web', () => {
      expect(transformDecl('font-family', 'serif, Helvetica, sans-serif')).toEqual({
        fontFamily: 'serif, Helvetica, sans-serif',
      });
    });
  });
});

// Spec source: https://drafts.csswg.org/css-overflow-3/#text-overflow
// Grammar (Overflow 3 §6.1 / Overflow 4 §6.1):
//   text-overflow = clip | ellipsis
// Initial: clip. Applies to: block containers. Inherited: no.
describe('text-overflow spec compliance (CSS Overflow §6.1)', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // "ellipsis: Render an ellipsis character (U+2026) to represent
  // clipped inline content."
  it('ellipsis lifts ellipsizeMode: tail on Text components', () => {
    expect(transformDecl('text-overflow', 'ellipsis')).toEqual({ ellipsizeMode: 'tail' });
  });

  // "clip: Clip inline content that overflows its block container
  // element. Characters may be only partially rendered."
  it('clip lifts ellipsizeMode: clip', () => {
    expect(transformDecl('text-overflow', 'clip')).toEqual({ ellipsizeMode: 'clip' });
  });

  // Unknown keywords are invalid per the §6.1 grammar (`clip | ellipsis`).
  it('rejects unknown keywords', () => {
    expect(transformDecl('text-overflow', 'fade')).toEqual({});
    expect(transformDecl('text-overflow', '"…"')).toEqual({});
  });

  // rn-web passes the keyword through so the browser's own overflow
  // handling kicks in once the parent has `overflow: hidden` and
  // `white-space: nowrap` (or an equivalent constraint).
  describeOnRnWeb(() => {
    it('ellipsis passes through to the browser', () => {
      expect(transformDecl('text-overflow', 'ellipsis')).toEqual({ textOverflow: 'ellipsis' });
    });

    it('clip passes through to the browser', () => {
      expect(transformDecl('text-overflow', 'clip')).toEqual({ textOverflow: 'clip' });
    });
  });
});

// Spec source: https://drafts.csswg.org/css-overscroll-1/#propdef-overscroll-behavior
// Grammar (CSS Overscroll Behavior 1 §4):
//   overscroll-behavior = [ contain | none | auto ]{1,2}
// "contain: must not perform non-local boundary default actions such as
// scroll chaining or navigation. ... none: implies the same behavior as
// contain and in addition must also not perform local boundary default
// actions such as showing any overscroll affordances. ... auto: the user
// agent should perform the usual boundary default action."
describe('overscroll-behavior spec compliance (CSS Overscroll Behavior 1 §4)', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // contain / none turn off RN's bounce and the Android overscroll glow so
  // the user-observed effect ("no scroll chaining or overscroll affordance")
  // matches the spec on iOS and Android.
  it('overscroll-behavior: contain lifts ScrollView bounces=false + overScrollMode=never', () => {
    expect(transformDecl('overscroll-behavior', 'contain')).toEqual({
      bounces: false,
      overScrollMode: 'never',
    });
  });

  it('overscroll-behavior: none lifts ScrollView bounces=false + overScrollMode=never', () => {
    expect(transformDecl('overscroll-behavior', 'none')).toEqual({
      bounces: false,
      overScrollMode: 'never',
    });
  });

  // auto restores the platform defaults explicitly (so a previously-set
  // contain / none can be cleared per the cascade).
  it('overscroll-behavior: auto lifts ScrollView bounces=true + overScrollMode=auto', () => {
    expect(transformDecl('overscroll-behavior', 'auto')).toEqual({
      bounces: true,
      overScrollMode: 'auto',
    });
  });

  it('overscroll-behavior: invalid keyword is rejected', () => {
    expect(transformDecl('overscroll-behavior', 'bounce')).toEqual({});
  });

  describeOnRnWeb(() => {
    it('contain passes through to the browser', () => {
      expect(transformDecl('overscroll-behavior', 'contain')).toEqual({
        overscrollBehavior: 'contain',
      });
    });

    it('none passes through to the browser', () => {
      expect(transformDecl('overscroll-behavior', 'none')).toEqual({
        overscrollBehavior: 'none',
      });
    });
  });
});

// Spec source: https://drafts.csswg.org/css-scrollbars-1/#scrollbar-width
// Grammar (CSS Scrollbars 1 §3):
//   scrollbar-width = auto | thin | none
// "auto: use the default scrollbar width. thin: use thinner scrollbars
// than auto. none: must not display any scrollbar, however the element's
// scrollability by other means is not affected."
describe('scrollbar-width spec compliance (CSS Scrollbars 1 §3)', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // none hides both indicators; the ScrollView still scrolls programmatically.
  it('scrollbar-width: none hides both ScrollView indicators', () => {
    expect(transformDecl('scrollbar-width', 'none')).toEqual({
      showsVerticalScrollIndicator: false,
      showsHorizontalScrollIndicator: false,
    });
  });

  it('scrollbar-width: auto shows both indicators (platform default)', () => {
    expect(transformDecl('scrollbar-width', 'auto')).toEqual({
      showsVerticalScrollIndicator: true,
      showsHorizontalScrollIndicator: true,
    });
  });

  // "User agents may disregard [thin] and treat it as auto..." iOS / Android
  // have no thin-scrollbar surface, so we treat thin as auto with no warn.
  it('scrollbar-width: thin behaves as auto on native (no thin-scrollbar surface)', () => {
    expect(transformDecl('scrollbar-width', 'thin')).toEqual({
      showsVerticalScrollIndicator: true,
      showsHorizontalScrollIndicator: true,
    });
  });

  it('scrollbar-width: invalid keyword is rejected', () => {
    expect(transformDecl('scrollbar-width', 'medium')).toEqual({});
  });

  describeOnRnWeb(() => {
    it('none passes through to the browser', () => {
      expect(transformDecl('scrollbar-width', 'none')).toEqual({ scrollbarWidth: 'none' });
    });
    it('thin passes through to the browser', () => {
      expect(transformDecl('scrollbar-width', 'thin')).toEqual({ scrollbarWidth: 'thin' });
    });
    it('auto passes through to the browser', () => {
      expect(transformDecl('scrollbar-width', 'auto')).toEqual({ scrollbarWidth: 'auto' });
    });
  });
});

// Spec source: https://drafts.csswg.org/css-ui-4/#widget-accent
// Grammar (CSS UI 4 §7.1):
//   accent-color = auto | <color>
// "auto: Represents a UA-chosen color, which should match the accent color
// of the platform, if any."
// "<color>: Specifies the color to be used as the accent color."
// On web the property tints native form controls (<input type=checkbox>,
// type=radio, type=range, <progress>). On React Native the analogous
// primitive is <Switch>, whose `trackColor.true` paints the on-state
// surface (the closest mirror of a checked checkbox fill).
describe('accent-color spec compliance (CSS UI 4 §7.1)', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('accent-color: <color> lifts trackColor.true onto Switch and keeps accentColor for attrs routing', () => {
    expect(transformDecl('accent-color', 'red')).toEqual({
      accentColor: 'red',
      trackColor: { true: 'red' },
    });
  });

  // "auto: Represents a UA-chosen color, which should match the accent
  // color of the platform, if any." On native we resolve via the CSS Color 4
  // `AccentColor` system keyword, which folds to iOS `systemBlue` and
  // Android `?attr/colorAccent`.
  it('accent-color: auto resolves to the platform AccentColor PlatformColor', () => {
    const out = transformDecl('accent-color', 'auto');
    const semantic = expect.objectContaining({
      semantic: expect.arrayContaining(['systemBlue', '?attr/colorAccent']),
    });
    expect(out.accentColor).toEqual(semantic);
    expect((out.trackColor as Record<string, unknown>).true).toEqual(semantic);
  });

  // Theme tokens and system color keywords also flow through the same color
  // folder; the lift carries either kind into trackColor.true. SelectedItem
  // resolves to a list whose first entry is the platform AccentColor.
  it('accent-color: SelectedItem (CSS Color 4 §9 system color) folds via PlatformColor', () => {
    const out = transformDecl('accent-color', 'SelectedItem');
    expect((out.trackColor as Record<string, unknown>).true).toEqual(
      expect.objectContaining({
        semantic: expect.arrayContaining(['AccentColor']),
      })
    );
  });

  it('accent-color: invalid value is rejected', () => {
    expect(transformDecl('accent-color', '1px solid red')).toEqual({});
  });

  describeOnRnWeb(() => {
    it('<color> passes through so the browser tints native controls', () => {
      expect(transformDecl('accent-color', 'red')).toEqual({ accentColor: 'red' });
    });
    it('auto passes through to the browser', () => {
      expect(transformDecl('accent-color', 'auto')).toEqual({ accentColor: 'auto' });
    });
  });
});

describe('font-size standalone spec compliance (CSS Fonts 4 §2.5)', () => {
  // Spec source: https://drafts.csswg.org/css-fonts-4/#font-size-prop
  // Grammar: `<absolute-size> | <relative-size> | <length-percentage [0,∞]>`.
  // <absolute-size> = [ xx-small | x-small | small | medium | large | x-large
  //                     | xx-large | xxx-large ].
  // <relative-size> = [ larger | smaller ].

  describe('<absolute-size> keywords', () => {
    // Spec: "An <absolute-size> keyword refers to an entry in a table of
    // font sizes computed and kept by the user agent." Native ships a
    // fixed ramp [9, 10, 13, 16, 18, 24, 32, 48] so iOS / Android / rn-web
    // resolve identically.
    it('xx-small folds to 9px', () => {
      expect(transformDecl('font-size', 'xx-small')).toEqual({ fontSize: 9 });
    });
    it('x-small folds to 10px', () => {
      expect(transformDecl('font-size', 'x-small')).toEqual({ fontSize: 10 });
    });
    it('small folds to 13px', () => {
      expect(transformDecl('font-size', 'small')).toEqual({ fontSize: 13 });
    });
    it('medium folds to 16px', () => {
      expect(transformDecl('font-size', 'medium')).toEqual({ fontSize: 16 });
    });
    it('large folds to 18px', () => {
      expect(transformDecl('font-size', 'large')).toEqual({ fontSize: 18 });
    });
    it('x-large folds to 24px', () => {
      expect(transformDecl('font-size', 'x-large')).toEqual({ fontSize: 24 });
    });
    it('xx-large folds to 32px', () => {
      expect(transformDecl('font-size', 'xx-large')).toEqual({ fontSize: 32 });
    });
    it('xxx-large folds to 48px', () => {
      expect(transformDecl('font-size', 'xxx-large')).toEqual({ fontSize: 48 });
    });
  });

  describe('<relative-size> keywords', () => {
    // Spec: "A <relative-size> keyword is interpreted relative to the
    // computed font-size of the parent element and possibly the table of
    // font sizes." The handler emits a sentinel resolved at render time
    // against `env.fontSize`; if the parent's size matches an entry in
    // the ramp, the resolver picks the adjacent entry, otherwise it
    // applies the spec-recommended 1.2 ratio.
    it('larger emits a sentinel that resolves against env.fontSize', () => {
      const out = transformDecl('font-size', 'larger');
      // Sentinel is the same one the `font:` shorthand emits.
      expect(out.fontSize).toBe('\0+');
    });
    it('smaller emits a sentinel that resolves against env.fontSize', () => {
      const out = transformDecl('font-size', 'smaller');
      expect(out.fontSize).toBe('\0-');
    });
  });

  describe('<length-percentage>', () => {
    // Spec: "A length value specifies an absolute font size … A percentage
    // value specifies an absolute font size relative to the parent
    // element's computed font-size." Percentages compute identically to
    // `em` once anchored at the parent, so the handler maps `N%` to
    // `(N/100)em` and lets the cascade resolver pick it up.
    it('px length folds to a number', () => {
      expect(transformDecl('font-size', '20px')).toEqual({ fontSize: 20 });
    });
    it('zero is permitted', () => {
      expect(transformDecl('font-size', '0')).toEqual({ fontSize: 0 });
    });
    it('em passes through as raw for the cascade resolver', () => {
      expect(transformDecl('font-size', '1.25em')).toEqual({ fontSize: '1.25em' });
    });
    it('rem passes through as raw for the cascade resolver', () => {
      expect(transformDecl('font-size', '2rem')).toEqual({ fontSize: '2rem' });
    });
    it('lh passes through as raw for the cascade resolver', () => {
      expect(transformDecl('font-size', '0.5lh')).toEqual({ fontSize: '0.5lh' });
    });
    it('percentage compiles to an em ratio (Fonts 4 §2.5: percent of parent font-size)', () => {
      // 80% of parent's font-size == 0.8em; both resolve via the same
      // cascade slot.
      expect(transformDecl('font-size', '80%')).toEqual({ fontSize: '0.8em' });
      expect(transformDecl('font-size', '120%')).toEqual({ fontSize: '1.2em' });
    });
    it('negative length is invalid', () => {
      // Spec: "Negative lengths are invalid." The handler returns {}.
      expect(transformDecl('font-size', '-1px')).toEqual({});
    });
    it('negative percentage is invalid', () => {
      // Spec: "Negative percentages are invalid."
      expect(transformDecl('font-size', '-20%')).toEqual({});
    });
  });

  describeOnRnWeb(() => {
    it('absolute-size keyword passes through to the browser', () => {
      expect(transformDecl('font-size', 'large')).toEqual({ fontSize: 'large' });
    });
    it('relative-size keyword passes through to the browser', () => {
      expect(transformDecl('font-size', 'larger')).toEqual({ fontSize: 'larger' });
    });
    it('percentage passes through to the browser', () => {
      expect(transformDecl('font-size', '80%')).toEqual({ fontSize: '80%' });
    });
  });
});

describe('line-height font-relative units (CSS Inline 3 §5.1)', () => {
  // Spec source: https://drafts.csswg.org/css-inline-3/#line-height-property
  // "Percentages: computed relative to 1em". A percentage line-height is
  // therefore equivalent to the same ratio in `em`, so the handler maps
  // it to the em form and reuses the existing font-relative resolver.

  it('em passes through as raw for the cascade resolver', () => {
    expect(transformDecl('line-height', '1.5em')).toEqual({ lineHeight: '1.5em' });
  });
  it('rem passes through as raw for the cascade resolver', () => {
    expect(transformDecl('line-height', '1.25rem')).toEqual({ lineHeight: '1.25rem' });
  });
  it('lh passes through as raw for the cascade resolver', () => {
    expect(transformDecl('line-height', '1lh')).toEqual({ lineHeight: '1lh' });
  });
  it('rlh passes through as raw for the cascade resolver', () => {
    expect(transformDecl('line-height', '2rlh')).toEqual({ lineHeight: '2rlh' });
  });
  it('percentage compiles to an em ratio (Inline 3 §5.1: computed relative to 1em)', () => {
    expect(transformDecl('line-height', '140%')).toEqual({ lineHeight: '1.4em' });
    expect(transformDecl('line-height', '100%')).toEqual({ lineHeight: '1em' });
  });
  it('unitless multiplier still folds to a number', () => {
    expect(transformDecl('line-height', '1.4')).toEqual({ lineHeight: 1.4 });
  });
  it('px length still folds to a number', () => {
    expect(transformDecl('line-height', '20px')).toEqual({ lineHeight: 20 });
  });
  it('normal still resolves to {} (RN default)', () => {
    expect(transformDecl('line-height', 'normal')).toEqual({});
  });

  describeOnRnWeb(() => {
    it('em passes through to the browser', () => {
      expect(transformDecl('line-height', '1.5em')).toEqual({ lineHeight: '1.5em' });
    });
    it('percentage passes through to the browser', () => {
      expect(transformDecl('line-height', '140%')).toEqual({ lineHeight: '140%' });
    });
  });
});
