/**
 * Microbench + CPU-profile harness for the native processing stack.
 *
 * Exercises the transform + compile pipeline across a range of input
 * flavors and sizes. Prints op/sec for each scenario (median over runs).
 *
 * Run with (from `packages/styled-components`; optional `--cpu-prof-dir=./.cpu-profiles`):
 *   bun src/native/profile-pipeline.ts
 *   bun --cpu-prof --cpu-prof-md --cpu-prof-name=native-profile --cpu-prof-dir=./.cpu-profiles src/native/profile-pipeline.ts
 *
 * The `--cpu-prof-md` flag emits a markdown summary of the heaviest
 * call stacks, which we cross-reference with bench numbers when
 * deciding what to optimise.
 */

import './bunProfileGlobals';

import { transformDecl } from './transform';
import { tokenize } from './transform/tokenize';
import { compileNativeStyles, resetNativeStyleCache } from '../models/nativeStyleCompiler';
import { applyResolvers, ResolveEnv } from './transform/polyfills/resolvers';
import makeInlineStyleClass from '../models/InlineStyle';

const stubStyleSheet = { create: <T extends object>(s: T) => s } as any;
const InlineStyle = makeInlineStyleClass(stubStyleSheet);

function bench(name: string, iters: number, fn: (i?: number) => void): number {
  if (typeof (globalThis as any).gc === 'function') (globalThis as any).gc();
  // Warmup — same shape as measurement so V8 tiers up before sampling.
  const warm = Math.min(Math.max(Math.floor(iters / 10), 100), 5000);
  for (let i = 0; i < warm; i++) fn();
  const samples: number[] = [];
  const RUNS = 7;
  for (let r = 0; r < RUNS; r++) {
    if (typeof (globalThis as any).gc === 'function') (globalThis as any).gc();
    const t0 = performance.now();
    for (let i = 0; i < iters; i++) fn();
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  const median = samples[Math.floor(RUNS / 2)];
  const ops = (iters / median) * 1000;
  const fmt =
    ops >= 1e6
      ? (ops / 1e6).toFixed(2) + 'M/s'
      : ops >= 1e3
        ? (ops / 1e3).toFixed(1) + 'K/s'
        : ops.toFixed(0) + '/s';
  const spread = (((samples[RUNS - 1] - samples[0]) / median) * 100).toFixed(0);
  console.log(
    `  ${name.padEnd(54)} ${median.toFixed(2).padStart(8)}ms  ${fmt.padStart(10)}  ±${spread}%`
  );
  return median;
}

// ────────────────────────────────────────────────────────────────────
// Single-decl flavors — measure transformDecl in isolation
// ────────────────────────────────────────────────────────────────────

console.log('\n=== transformDecl single-pair ===');
bench('passthrough (transform: scale(2))', 200_000, () => transformDecl('transform', 'scale(2)'));
bench('numeric (padding-top: 8px)', 200_000, () => transformDecl('padding-top', '8px'));
bench('hex color (color: #ff0000)', 200_000, () => transformDecl('color', '#ff0000'));
bench('rgb color (color: rgb(200, 200, 200))', 200_000, () =>
  transformDecl('color', 'rgb(200, 200, 200)')
);
bench('shorthand 4-value (padding: 4px 8px 12px 16px)', 100_000, () =>
  transformDecl('padding', '4px 8px 12px 16px')
);
bench('shorthand 1-value (padding: 8px)', 200_000, () => transformDecl('padding', '8px'));
bench('border composite (1px solid #000)', 100_000, () =>
  transformDecl('border', '1px solid #000')
);
bench('flex composite (1 1 0)', 100_000, () => transformDecl('flex', '1 1 0'));
bench('static math (clamp(10px, 50%, 400px))', 100_000, () =>
  transformDecl('width', 'clamp(10px, 50%, 400px)')
);
bench('static color (oklch(0.5 0.1 180))', 50_000, () =>
  transformDecl('color', 'oklch(0.5 0.1 180)')
);
bench('color-mix (color-mix(in srgb, red, blue))', 50_000, () =>
  transformDecl('color', 'color-mix(in srgb, red, blue)')
);
bench('viewport unit (height: 100vh)', 200_000, () => transformDecl('height', '100vh'));
bench('sentinel (color: \\0sc:fg:#000)', 200_000, () => transformDecl('color', '\0sc:fg:#000'));
bench('logical shorthand (margin-inline: 8px 16px)', 100_000, () =>
  transformDecl('margin-inline', '8px 16px')
);
bench('text-shadow (1px 2px 4px black)', 100_000, () =>
  transformDecl('text-shadow', '1px 2px 4px black')
);

// ────────────────────────────────────────────────────────────────────
// Tokenizer in isolation
// ────────────────────────────────────────────────────────────────────

console.log('\n=== tokenize() ===');
bench('tokenize trivial (#fff)', 500_000, () => tokenize('#fff'));
bench('tokenize medium (clamp(10px, 50%, 400px))', 200_000, () =>
  tokenize('clamp(10px, 50%, 400px)')
);
bench('tokenize complex (oklch(0.628 0.258 29.234 / 0.9))', 200_000, () =>
  tokenize('oklch(0.628 0.258 29.234 / 0.9)')
);
bench('tokenize compound (4 8 12 16 px-mix)', 200_000, () => tokenize('4px 8px 12px 16px'));

// ────────────────────────────────────────────────────────────────────
// compileNativeStyles — full path including parser
// ────────────────────────────────────────────────────────────────────

const CSS_TINY = 'color: red;';
const CSS_SMALL = `
  color: red;
  padding: 8px;
  border-radius: 4px;
  flex: 1;
  font-size: 14px;
`;
const CSS_MEDIUM = `
  color: black;
  padding: 8px 16px;
  margin: 4px;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  flex: 1;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  font-size: 14px;
  font-weight: bold;
  opacity: 0.95;
  width: 100%;
  height: 200px;
  text-align: center;
`;
const CSS_LARGE = (() => {
  let css = CSS_MEDIUM;
  css += `\n@media (min-width: 400px) { padding: 16px; font-size: 16px; }\n`;
  css += `@media (min-width: 800px) { padding: 24px; font-size: 18px; }\n`;
  css += `@container (min-width: 300px) { color: blue; }\n`;
  css += `&:hover { color: purple; }\n`;
  css += `&:focus { border-color: red; }\n`;
  css += `&:pressed { opacity: 0.5; }\n`;
  css += `&:disabled { opacity: 0.3; }\n`;
  for (let i = 0; i < 5; i++) {
    css += `&:is(:hover, :focus) { transform: scale(${1 + i * 0.05}); }\n`;
  }
  return css;
})();
const CSS_POLYFILL = `
  width: clamp(10px, 50vw, 400px);
  height: max(100px, 50vh);
  color: oklch(0.628 0.258 29.234);
  background-color: color-mix(in oklab, red, blue 30%);
  margin-inline: 8px 16px;
  padding-block: 4px 12px;
`;
const CSS_SENTINEL = `
  color: \0sc:colors.fg:#000000;
  background-color: \0sc:colors.bg:#ffffff;
  border-color: \0sc:colors.border:#cccccc;
  padding: 8px;
`;

console.log('\n=== compileNativeStyles cold (cache reset each iter) ===');
bench('cold tiny (1 decl)', 20_000, () => {
  resetNativeStyleCache();
  compileNativeStyles(CSS_TINY, stubStyleSheet);
});
bench('cold small (5 decls)', 10_000, () => {
  resetNativeStyleCache();
  compileNativeStyles(CSS_SMALL, stubStyleSheet);
});
bench('cold medium (15 decls)', 5_000, () => {
  resetNativeStyleCache();
  compileNativeStyles(CSS_MEDIUM, stubStyleSheet);
});
bench('cold large (medium + nested rules + at-rules)', 2_000, () => {
  resetNativeStyleCache();
  compileNativeStyles(CSS_LARGE, stubStyleSheet);
});
bench('cold polyfill-heavy', 5_000, () => {
  resetNativeStyleCache();
  compileNativeStyles(CSS_POLYFILL, stubStyleSheet);
});
bench('cold sentinel (createTheme)', 5_000, () => {
  resetNativeStyleCache();
  compileNativeStyles(CSS_SENTINEL, stubStyleSheet);
});

console.log('\n=== compileNativeStyles warm (cache hit) ===');
bench('warm tiny', 1_000_000, () => compileNativeStyles(CSS_TINY, stubStyleSheet));
bench('warm small', 1_000_000, () => compileNativeStyles(CSS_SMALL, stubStyleSheet));
bench('warm medium', 1_000_000, () => compileNativeStyles(CSS_MEDIUM, stubStyleSheet));
bench('warm large', 500_000, () => compileNativeStyles(CSS_LARGE, stubStyleSheet));
bench('warm polyfill', 500_000, () => compileNativeStyles(CSS_POLYFILL, stubStyleSheet));
bench('warm sentinel', 500_000, () => compileNativeStyles(CSS_SENTINEL, stubStyleSheet));

// ────────────────────────────────────────────────────────────────────
// applyResolvers — render-time pass over compiled output
// ────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────
// InlineStyle.compile — the actual per-render entry point used by
// StyledNativeComponent. Static-rules fast-path lives here.
// ────────────────────────────────────────────────────────────────────

console.log('\n=== InlineStyle.compile (per-render entry) ===');
const isStaticTiny = new InlineStyle([CSS_TINY] as any);
const isStaticSmall = new InlineStyle([CSS_SMALL] as any);
const isStaticMedium = new InlineStyle([CSS_MEDIUM] as any);
const isStaticLarge = new InlineStyle([CSS_LARGE] as any);
const isDynamicTiny = new InlineStyle(['color: ', (p: any) => p.$color, ';'] as any);
const isDynamicMedium = new InlineStyle([
  CSS_MEDIUM + ' color: ',
  (p: any) => p.$color,
  ';',
] as any);
// Dynamic but the function output is stable (e.g., theme token doesn't change)
const isDynamicStable = new InlineStyle([
  'color: ',
  (p: any) => p.theme.primary,
  '; padding: 8px;',
] as any);

const ctx: any = { theme: { primary: '#333' }, $color: 'red' };

bench('static tiny — InlineStyle.compile', 5_000_000, () => isStaticTiny.compile(ctx));
bench('static small — InlineStyle.compile', 5_000_000, () => isStaticSmall.compile(ctx));
bench('static medium — InlineStyle.compile', 5_000_000, () => isStaticMedium.compile(ctx));
bench('static large — InlineStyle.compile', 5_000_000, () => isStaticLarge.compile(ctx));
bench(
  'dynamic tiny — InlineStyle.compile (varying prop)',
  1_000_000,
  (() => {
    let i = 0;
    return () => {
      ctx.$color = 'c' + (i++ % 30);
      isDynamicTiny.compile(ctx);
    };
  })()
);
bench(
  'dynamic medium — InlineStyle.compile (varying prop)',
  500_000,
  (() => {
    let i = 0;
    return () => {
      ctx.$color = 'c' + (i++ % 30);
      isDynamicMedium.compile(ctx);
    };
  })()
);
// Stable output dedup: prop varies but CSS function returns same string
bench(
  'dynamic stable output — varying unrelated prop',
  5_000_000,
  (() => {
    let i = 0;
    return () => {
      ctx.$color = 'c' + (i++ % 30); // varies but unused by CSS function
      isDynamicStable.compile(ctx);
    };
  })()
);

console.log('\n=== applyResolvers (render-time pass) ===');
const compiledNoResolvers = compileNativeStyles(CSS_MEDIUM, stubStyleSheet);
const compiledWithResolvers = compileNativeStyles(
  'width: 100vw; height: 50vh; color: light-dark(white, black); padding-top: env(safe-area-inset-top, 0);',
  stubStyleSheet
);
const compiledSentinel = compileNativeStyles(CSS_SENTINEL, stubStyleSheet);

const env: ResolveEnv = {
  media: {
    width: 375,
    height: 812,
    colorScheme: 'light',
    reduceMotion: false,
    fontScale: 1,
    pixelRatio: 2,
  } as any,
  container: null,
  theme: { colors: { fg: '#111', bg: '#fff', border: '#ddd' } },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
  rootFontSize: 16,
};

bench('apply (no resolvers — fast path)', 5_000_000, () => {
  applyResolvers(compiledNoResolvers.base, [], env);
});
bench('apply (4 resolvers)', 1_000_000, () => {
  applyResolvers(compiledWithResolvers.base, compiledWithResolvers.resolvers!, env);
});
bench('apply (3 sentinel resolvers)', 1_000_000, () => {
  applyResolvers(compiledSentinel.base, compiledSentinel.resolvers!, env);
});

console.log('\nDone.');
