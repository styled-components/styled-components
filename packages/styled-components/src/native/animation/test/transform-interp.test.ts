/**
 * Direct coverage of the transform interpolation helper. We exercise
 * the parser + identity-fill + ordering rules against a fake `progress`
 * stub so the assertions don't depend on RN's runtime evaluation.
 */
import {
  __interpolateTransformForTests as interpolateTransform,
  __parseTransformStringForTests as parseTransformString,
  __transformIdentityForTests as transformIdentity,
} from '../';
import type { EasingDescriptor } from '../types';

interface FakeInterp {
  inputRange: number[];
  outputRange: ReadonlyArray<number | string>;
  extrapolate?: string;
}

const fakeProgress = {
  interpolate(config: {
    inputRange: number[];
    outputRange: ReadonlyArray<number | string>;
    extrapolate?: string;
  }): FakeInterp {
    return {
      inputRange: config.inputRange,
      outputRange: config.outputRange,
      extrapolate: config.extrapolate,
    };
  },
};

const LINEAR: EasingDescriptor = { kind: 'linear' };

function readKind(entry: any): string {
  for (const k in entry) return k;
  return '';
}

describe('parseTransformString', () => {
  it('parses translate components', () => {
    expect(parseTransformString('translateX(16px) translateY(-12px)')).toMatchInlineSnapshot(`
      [
        {
          "kind": "translateX",
          "value": 16,
        },
        {
          "kind": "translateY",
          "value": -12,
        },
      ]
    `);
  });

  it('parses rotate + scale', () => {
    expect(parseTransformString('rotate(18deg) scale(0.85)')).toMatchInlineSnapshot(`
      [
        {
          "kind": "rotate",
          "value": "18deg",
        },
        {
          "kind": "scale",
          "value": 0.85,
        },
      ]
    `);
  });

  it('parses skew + translate', () => {
    expect(parseTransformString('skewX(-12deg) translateY(8px)')).toMatchInlineSnapshot(`
      [
        {
          "kind": "skewX",
          "value": "-12deg",
        },
        {
          "kind": "translateY",
          "value": 8,
        },
      ]
    `);
  });

  // Regression guard: the previous /([A-Za-z]+)\s*\(\s*([^)]+?)\s*\)/g
  // shape exhibited polynomial backtracking. A user-authored value with
  // a long whitespace run and no closing paren — reachable from any
  // styled `transform:` animation tick — spun the CPU for ~16 s. The
  // budget catches any reintroduction of the lazy-quantifier shape.
  it('rejects whitespace-padded malformed transform within a wall-clock budget', () => {
    const attack = 'translate(' + ' '.repeat(2000) + 'X';
    const t0 = Date.now();
    parseTransformString(attack);
    expect(Date.now() - t0).toBeLessThan(50);
  });
});

describe('transformIdentity', () => {
  it('returns 0 for translate', () => {
    expect(transformIdentity('translateX')).toBe(0);
    expect(transformIdentity('translateY')).toBe(0);
    expect(transformIdentity('translateZ')).toBe(0);
  });
  it('returns 1 for scale', () => {
    expect(transformIdentity('scale')).toBe(1);
    expect(transformIdentity('scaleX')).toBe(1);
    expect(transformIdentity('scaleY')).toBe(1);
  });
  it('returns "0deg" for rotate / skew', () => {
    expect(transformIdentity('rotate')).toBe('0deg');
    expect(transformIdentity('rotateZ')).toBe('0deg');
    expect(transformIdentity('skewX')).toBe('0deg');
  });
  it('returns 1000 for perspective', () => {
    expect(transformIdentity('perspective')).toBe(1000);
  });
});

describe('interpolateTransform', () => {
  it('morphs disjoint kinds via identity fill (translate → rotate+scale)', () => {
    const out = interpolateTransform(
      fakeProgress as any,
      'translateX(16px) translateY(-12px)',
      'rotate(18deg) scale(0.85)',
      ['translateX', 'translateY', 'rotate', 'scale'],
      LINEAR,
      300
    );
    expect(out).not.toBeNull();
    // Order: prev's kinds first (translateX, translateY), then any new
    // kinds from next (rotate, scale).
    expect(out!.map(readKind)).toMatchInlineSnapshot(`
      [
        "translateX",
        "translateY",
        "rotate",
        "scale",
      ]
    `);
    // translateX morphs from 16 → 0 (identity), rotate morphs from 0deg → 18deg, etc.
    expect((out![0].translateX as FakeInterp).outputRange).toEqual([16, 0]);
    expect((out![1].translateY as FakeInterp).outputRange).toEqual([-12, 0]);
    expect((out![2].rotate as FakeInterp).outputRange).toEqual(['0deg', '18deg']);
    expect((out![3].scale as FakeInterp).outputRange).toEqual([1, 0.85]);
  });

  it('morphs matched-kind transforms (translateX only)', () => {
    const out = interpolateTransform(
      fakeProgress as any,
      'translateX(0px)',
      'translateX(100px)',
      ['translateX'],
      LINEAR,
      300
    );
    expect(out).not.toBeNull();
    expect(out!.length).toBe(1);
    expect((out![0].translateX as FakeInterp).inputRange).toEqual([0, 1]);
    expect((out![0].translateX as FakeInterp).outputRange).toEqual([0, 100]);
  });

  it('emits the union of kinds in the supplied order', () => {
    // Caller supplies the stable, growing union; the output array
    // matches that order regardless of which kinds are present in
    // prev/next individually.
    const out = interpolateTransform(
      fakeProgress as any,
      'rotate(0deg) translateX(0px)',
      'translateX(100px) rotate(45deg)',
      ['rotate', 'translateX'],
      LINEAR,
      300
    );
    expect(out).not.toBeNull();
    expect(out!.map(readKind)).toEqual(['rotate', 'translateX']);
  });

  it('accepts array form for prev or next', () => {
    const out = interpolateTransform(
      fakeProgress as any,
      [{ translateX: 0 }],
      'translateX(50px)',
      ['translateX'],
      LINEAR,
      300
    );
    expect(out).not.toBeNull();
    expect((out![0].translateX as FakeInterp).inputRange).toEqual([0, 1]);
    expect((out![0].translateX as FakeInterp).outputRange).toEqual([0, 50]);
  });

  it('returns null when neither prev nor next is parseable', () => {
    expect(
      interpolateTransform(fakeProgress as any, 42, 99, ['translateX'], LINEAR, 300)
    ).toBeNull();
  });

  it('fills identity values for kinds in the union but absent from prev/next', () => {
    // The union contains all four kinds, but next only mentions rotate
    // + scale. The translateX/translateY entries should interpolate
    // from prev's literal values to identity (0).
    const out = interpolateTransform(
      fakeProgress as any,
      'translateX(16px) translateY(-12px)',
      'rotate(45deg) scale(1.4)',
      ['translateX', 'translateY', 'rotate', 'scale'],
      LINEAR,
      300
    );
    expect(out).not.toBeNull();
    expect((out![0].translateX as FakeInterp).outputRange).toEqual([16, 0]);
    expect((out![1].translateY as FakeInterp).outputRange).toEqual([-12, 0]);
    expect((out![2].rotate as FakeInterp).outputRange).toEqual(['0deg', '45deg']);
    expect((out![3].scale as FakeInterp).outputRange).toEqual([1, 1.4]);
  });

  it('bakes a cubic-bezier easing curve into the per-kind outputRange', () => {
    // Native driver runs Animated.timing on a linear timeline, so the
    // adapter has to bake the curve into the interpolate outputRange.
    // ease-in-out cubic-bezier(0.37, 0, 0.63, 1) dwells at the extremes
    // and accelerates through the middle;the breath curve.
    const ease: EasingDescriptor = { kind: 'cubic-bezier', p: [0.37, 0, 0.63, 1] };
    const out = interpolateTransform(
      fakeProgress as any,
      'scale(1)',
      'scale(4)',
      ['scale'],
      ease,
      1600
    );
    expect(out).not.toBeNull();
    const interp = out![0].scale as FakeInterp;
    // 1600ms / 16.67ms ≈ 96 frames; sample count clamps in [32, 240].
    // Endpoints are guaranteed.
    expect(interp.inputRange.length).toBeGreaterThanOrEqual(60);
    expect(interp.inputRange[0]).toBe(0);
    expect(interp.inputRange[interp.inputRange.length - 1]).toBe(1);
    expect(interp.outputRange[0]).toBe(1);
    expect(interp.outputRange[interp.outputRange.length - 1]).toBe(4);
    // ease-in-out is symmetric: the midpoint sits at the linear midpoint…
    const midIdx = Math.floor((interp.inputRange.length - 1) / 2);
    const linearMid = 1 + 3 * interp.inputRange[midIdx];
    expect(Math.abs((interp.outputRange[midIdx] as number) - linearMid)).toBeLessThan(0.01);
    // …but a quarter through, the eased curve trails the linear ramp.
    const quarterIdx = Math.floor((interp.inputRange.length - 1) / 4);
    const quarterT = interp.inputRange[quarterIdx];
    const linearAtQuarter = 1 + 3 * quarterT;
    const easedAtQuarter = interp.outputRange[quarterIdx] as number;
    expect(easedAtQuarter).toBeLessThan(linearAtQuarter - 0.05);
  });

  it('uses more samples for longer durations (>=1 sample per 60fps frame)', () => {
    const ease: EasingDescriptor = { kind: 'cubic-bezier', p: [0.37, 0, 0.63, 1] };
    const short = interpolateTransform(
      fakeProgress as any,
      'scale(1)',
      'scale(2)',
      ['scale'],
      ease,
      100
    );
    const long = interpolateTransform(
      fakeProgress as any,
      'scale(1)',
      'scale(2)',
      ['scale'],
      ease,
      2000
    );
    const shortLen = (short![0].scale as FakeInterp).inputRange.length;
    const longLen = (long![0].scale as FakeInterp).inputRange.length;
    expect(longLen).toBeGreaterThan(shortLen);
    // 2000ms at 60fps = 120 frames; expect at least that many stops.
    expect(longLen).toBeGreaterThanOrEqual(120);
  });
});
