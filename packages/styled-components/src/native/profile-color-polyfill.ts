/**
 * Focused microbench + CPU-profile harness for the static color-math
 * polyfill (`colorMath.ts` + `mathFns.ts`). Bypasses `transformDecl`
 * orchestration so the profile is dominated by polyfill self-time.
 *
 * Run (from `packages/styled-components`):
 *   bun src/native/profile-color-polyfill.ts
 *   bun --cpu-prof --cpu-prof-md --cpu-prof-name=color-polyfill \
 *       --cpu-prof-dir=./.cpu-profiles src/native/profile-color-polyfill.ts
 */

import './bunProfileGlobals';

import { bench as benchBase } from './profileHarness';
import { staticColorFunctionToHex } from './transform/polyfills/colorMath';
import { resolveStaticMathFunction } from './transform/polyfills/mathFns';
import { tokenize } from './transform/tokenize';
import { TokenKind } from './transform/tokens';

const bench = (name: string, iters: number, fn: () => void) =>
  benchBase(name, iters, fn, { format: 'ns', pad: 50 });

/** Pre-tokenize so the bench measures polyfill work, not the tokenizer. */
function preTokenize(value: string) {
  const toks = tokenize(value);
  if (toks.length !== 1 || toks[0].kind !== TokenKind.Function) {
    throw new Error(`expected single function token: ${value}`);
  }
  return toks[0];
}

const PRE = {
  oklchLiteral: preTokenize('oklch(0.628 0.258 29.234)'),
  oklchPercent: preTokenize('oklch(50% 50% 270)'),
  oklabLiteral: preTokenize('oklab(0.628 0.226 0.126)'),
  lab: preTokenize('lab(50% 40 59.5)'),
  lch: preTokenize('lch(50% 40 12)'),
  hslNamed: preTokenize('hsl(120 50% 50%)'),
  hslDeg: preTokenize('hsl(120deg 50% 50%)'),
  hslAlpha: preTokenize('hsla(60, 100%, 37.5%, 50%)'),
  hwb: preTokenize('hwb(30 30% 40%)'),
  rgb: preTokenize('rgb(200, 50, 100)'),
  rgbModern: preTokenize('rgb(200 50 100 / 0.8)'),
  colorSrgb: preTokenize('color(srgb 0.5 0.2 0.7)'),
  colorP3: preTokenize('color(display-p3 0.5 0.2 0.7)'),
  colorXyz: preTokenize('color(xyz 0.4 0.3 0.5)'),
  colorMixSrgb: preTokenize('color-mix(in srgb, red, blue)'),
  colorMixSrgbPct: preTokenize('color-mix(in srgb, red 30%, blue 70%)'),
  colorMixOklab: preTokenize('color-mix(in oklab, oklab(0.3 0.1 0.1), oklab(0.7 -0.1 -0.1))'),
  colorMixOklch: preTokenize('color-mix(in oklch, oklch(0.3 0.1 30), oklch(0.7 0.1 270))'),
  colorMixLch: preTokenize('color-mix(in lch, lch(30 40 30), lch(70 40 270))'),
  colorMixHsl: preTokenize('color-mix(in hsl, hsl(30 50% 50%), hsl(270 50% 50%))'),
  colorMixDisplayP3: preTokenize(
    'color-mix(in display-p3, color(display-p3 1 0 0), color(display-p3 0 0 1))'
  ),
  colorMixXyz: preTokenize('color-mix(in xyz, color(xyz 0.5 0.2 0.1), color(xyz 0.1 0.2 0.5))'),
  colorMixNone: preTokenize(
    'color-mix(in srgb, color(srgb 0.5 none 0.5), color(srgb none 0.5 none))'
  ),
  calcSimple: preTokenize('calc(10px + 20px)'),
  calcNested: preTokenize('calc(100% / 2 + 8px)'),
  clamp: preTokenize('clamp(10px, 50%, 400px)'),
  minMax: preTokenize('min(100px, 50%)'),
};

console.log('\n=== staticColorFunctionToHex (parse + convert, pre-tokenized) ===');
bench('oklch literal', 500_000, () => staticColorFunctionToHex(PRE.oklchLiteral));
bench('oklch percent', 500_000, () => staticColorFunctionToHex(PRE.oklchPercent));
bench('oklab literal', 500_000, () => staticColorFunctionToHex(PRE.oklabLiteral));
bench('lab', 500_000, () => staticColorFunctionToHex(PRE.lab));
bench('lch', 500_000, () => staticColorFunctionToHex(PRE.lch));
bench('hsl (no deg)', 500_000, () => staticColorFunctionToHex(PRE.hslNamed));
bench('hsl (with deg)', 500_000, () => staticColorFunctionToHex(PRE.hslDeg));
bench('hsla (legacy comma)', 500_000, () => staticColorFunctionToHex(PRE.hslAlpha));
bench('hwb', 500_000, () => staticColorFunctionToHex(PRE.hwb));
bench('rgb (comma)', 500_000, () => staticColorFunctionToHex(PRE.rgb));
bench('rgb (modern slash)', 500_000, () => staticColorFunctionToHex(PRE.rgbModern));
bench('color(srgb …)', 500_000, () => staticColorFunctionToHex(PRE.colorSrgb));
bench('color(display-p3 …)', 500_000, () => staticColorFunctionToHex(PRE.colorP3));
bench('color(xyz …)', 500_000, () => staticColorFunctionToHex(PRE.colorXyz));

console.log('\n=== color-mix (the bigger workload) ===');
bench('color-mix in srgb (named operands)', 200_000, () =>
  staticColorFunctionToHex(PRE.colorMixSrgb)
);
bench('color-mix in srgb (with %)', 200_000, () => staticColorFunctionToHex(PRE.colorMixSrgbPct));
bench('color-mix in oklab', 200_000, () => staticColorFunctionToHex(PRE.colorMixOklab));
bench('color-mix in oklch (polar)', 200_000, () => staticColorFunctionToHex(PRE.colorMixOklch));
bench('color-mix in lch (polar)', 200_000, () => staticColorFunctionToHex(PRE.colorMixLch));
bench('color-mix in hsl (cylindrical sRGB)', 200_000, () =>
  staticColorFunctionToHex(PRE.colorMixHsl)
);
bench('color-mix in display-p3', 200_000, () => staticColorFunctionToHex(PRE.colorMixDisplayP3));
bench('color-mix in xyz', 200_000, () => staticColorFunctionToHex(PRE.colorMixXyz));
bench('color-mix w/ none channels (carry-fwd)', 200_000, () =>
  staticColorFunctionToHex(PRE.colorMixNone)
);

console.log('\n=== math fns (pre-tokenized) ===');
bench('calc(10px + 20px)', 500_000, () => resolveStaticMathFunction(PRE.calcSimple));
bench('calc(100% / 2 + 8px)', 500_000, () => resolveStaticMathFunction(PRE.calcNested));
bench('clamp(10px, 50%, 400px)', 500_000, () => resolveStaticMathFunction(PRE.clamp));
bench('min(100px, 50%)', 500_000, () => resolveStaticMathFunction(PRE.minMax));

console.log('\nDone.');
