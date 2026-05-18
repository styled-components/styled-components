/**
 * Focused microbench + CPU-profile harness for the native animation
 * pipeline (`animation/index.ts`). Targets the per-segment color +
 * value interpolation build path and the per-call color/transform
 * parse helpers; the work that runs every time a transition or
 * @keyframes animation kicks in.
 *
 * Run (from `packages/styled-components`):
 *   bun src/native/profile-animation.ts
 *   bun --cpu-prof --cpu-prof-md --cpu-prof-name=animation \
 *       --cpu-prof-dir=./.cpu-profiles src/native/profile-animation.ts
 */

import './bunProfileGlobals';

import { bench as benchBase } from './profileHarness';
import {
  __parseAnimColorForTests,
  __rgbaToCssForTests,
  __interpolateColorOklabForTests,
  __parseTransformStringForTests,
  __buildSegmentedInterpolationForTests,
  __additiveCombineForTests,
} from './animation';

const parseAnimColor = __parseAnimColorForTests;
const rgbaToCss = __rgbaToCssForTests;
const interpolateColorOklab = __interpolateColorOklabForTests;
const parseTransformString = __parseTransformStringForTests;
const buildSegmentedInterpolation = __buildSegmentedInterpolationForTests;
const additiveCombine = __additiveCombineForTests;

const bench = (name: string, iters: number, fn: () => void) =>
  benchBase(name, iters, fn, { format: 'ns' });

// ── Color parse / serialize ────────────────────────────────────────
console.log('\n=== parseAnimColor ===');
bench('hex #ff0000', 1_000_000, () => parseAnimColor('#ff0000'));
bench('hex #f00', 1_000_000, () => parseAnimColor('#f00'));
bench('hex #ff0000aa', 1_000_000, () => parseAnimColor('#ff0000aa'));
bench('rgb(200,50,100)', 1_000_000, () => parseAnimColor('rgb(200,50,100)'));
bench('rgba(200,50,100,0.5)', 1_000_000, () => parseAnimColor('rgba(200,50,100,0.5)'));
bench('rgb modern slash', 1_000_000, () => parseAnimColor('rgb(200 50 100 / 0.5)'));
bench('oklch (slow path)', 500_000, () => parseAnimColor('oklch(0.5 0.1 180)'));
bench('named (rebeccapurple)', 200_000, () => parseAnimColor('rebeccapurple'));

console.log('\n=== rgbaToCss ===');
const C1 = { r: 200, g: 50, b: 100, a: 1 };
const C2 = { r: 0.5, g: 100.5, b: 200.7, a: 0.8 };
bench('rgbaToCss opaque int', 2_000_000, () => rgbaToCss(C1));
bench('rgbaToCss fractional alpha', 2_000_000, () => rgbaToCss(C2));

console.log('\n=== interpolateColorOklab (standalone) ===');
const FROM = { r: 200, g: 50, b: 100, a: 1 };
const TO = { r: 50, g: 200, b: 100, a: 0.5 };
let mid = 0;
bench('oklab interp (varying t)', 1_000_000, () => {
  interpolateColorOklab(FROM, TO, mid);
  mid = (mid + 0.013) % 1;
});

// ── Build full segmented interpolation (per-transition start cost) ──
console.log('\n=== buildSegmentedInterpolation (per-transition start) ===');
const fakeProgress = { interpolate: (cfg: any) => cfg };
const topEasing = {
  kind: 'cubic-bezier' as const,
  p: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
};
const colorStops = [
  { offset: 0, value: '#ff0000' },
  { offset: 1, value: '#0000ff' },
];
const colorStopsMulti = [
  { offset: 0, value: 'red' },
  { offset: 0.5, value: 'green' },
  { offset: 1, value: 'blue' },
];
const numericStops = [
  { offset: 0, value: 0 },
  { offset: 1, value: 100 },
];
const unitStops = [
  { offset: 0, value: '0deg' },
  { offset: 1, value: '360deg' },
];
const noEasings = [undefined];

bench('numeric 2-stop, 300ms', 200_000, () =>
  buildSegmentedInterpolation(fakeProgress, numericStops, noEasings, topEasing, 300)
);
bench('unit-string 2-stop, 300ms', 200_000, () =>
  buildSegmentedInterpolation(fakeProgress, unitStops, noEasings, topEasing, 300)
);
bench('color 2-stop, 300ms', 200_000, () =>
  buildSegmentedInterpolation(fakeProgress, colorStops, noEasings, topEasing, 300)
);
bench('color 3-stop, 600ms', 100_000, () =>
  buildSegmentedInterpolation(fakeProgress, colorStopsMulti, [undefined, undefined], topEasing, 600)
);

// ── Transform parse ────────────────────────────────────────────────
console.log('\n=== parseTransformString ===');
bench('translateX(10px)', 500_000, () => parseTransformString('translateX(10px)'));
bench('scale(2)', 500_000, () => parseTransformString('scale(2)'));
bench('combo translate+rotate', 500_000, () =>
  parseTransformString('translateX(10px) rotate(45deg)')
);
bench('matrix3d (16 nums)', 500_000, () =>
  parseTransformString('matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 20, 0, 1)')
);

// ── Additive combine ───────────────────────────────────────────────
console.log('\n=== additiveCombine ===');
bench('additive numeric', 2_000_000, () => additiveCombine(10, 5));
bench('additive color', 500_000, () => additiveCombine('#ff0000', '#0000ff'));
bench('additive transform', 500_000, () =>
  additiveCombine([{ translateX: 10 }], [{ translateX: 5 }])
);

console.log('\nDone.');
