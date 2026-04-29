/**
 * Full pipeline (parse + emit) vs stylis (compile + serialize).
 *
 * Baseline-comparison bench: tracks throughput of the in-house compiler
 * relative to the displaced library. Stylis is retained as a
 * devDependency to back this comparison and the byte-parity corpus.
 *
 * Output is a changelog / marketing signal, not a v7-internal regression
 * detector — for those see `src/bench/web.test.js` (stress + render
 * throughput) and `src/bench/v6-vs-v7.bench.test.js` (cross-major head
 * to head).
 *
 * Run: pnpm --filter styled-components bench:web -- parser-pipeline
 */

import * as stylis from 'stylis';
import { parseEmitFlat } from '../parser/emit-fast';
import { emitWeb } from '../parser/emit-web';
import { parse } from '../parser/parser';
import { preprocessCSS } from '../utils/cssCompile';
import { bench as _bench } from './bench-utils';

const opts = { runs: 7, precision: 2, nameWidth: 50 };
const bench = (name: string, iterations: number, fn: (i: number) => void) =>
  _bench(name, iterations, fn, opts);

const CSS_TINY = 'color:red;background:blue;';

const CSS_SMALL = `
display: flex;
color: #333;
font-size: 14px;
padding: 8px 16px;
`;

const CSS_MEDIUM = `
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
padding: 16px 24px;
margin: 0 auto;
max-width: 1200px;
font-family: -apple-system, BlinkMacSystemFont, sans-serif;
font-size: 14px;
line-height: 1.5;
color: #333;
background-color: #fff;
border: 1px solid #e0e0e0;
border-radius: 8px;
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
transition: all 0.2s ease-in-out;
`;

const CSS_MEDIA_NESTED = `
display: flex;
padding: 16px;
color: #333;
@media (min-width: 500px) {
  padding: 24px;
  font-size: 16px;
}
@media (min-width: 900px) {
  padding: 32px;
  font-size: 18px;
  max-width: 1200px;
}
&:hover {
  background: #f5f5f5;
  transform: translateY(-2px);
}
`;

const CSS_KEYFRAMES = `
@keyframes fade {
  0% { opacity: 0; transform: translateY(8px); }
  50% { opacity: 0.5; }
  100% { opacity: 1; transform: translateY(0); }
}
`;

// Large real-world component: 60+ declarations, two @media blocks, one @supports,
// two nested rules. Representative of a heavy "kitchen sink" styled-component.
const CSS_LARGE = `
display: flex;
flex-direction: column;
align-items: stretch;
justify-content: space-between;
gap: 16px;
padding: 16px 24px;
margin: 0 auto;
max-width: 1200px;
width: 100%;
min-height: 100vh;
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
font-size: 14px;
line-height: 1.5;
letter-spacing: 0.01em;
color: #1a1a1a;
background-color: #ffffff;
background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 245, 250, 0.85) 100%);
border: 1px solid rgba(0, 0, 0, 0.08);
border-radius: 12px;
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.06), 0 16px 48px rgba(0, 0, 0, 0.08);
transition: transform 0.2s ease-out, box-shadow 0.2s ease-out, background-color 0.15s linear;
transform-origin: center center;
will-change: transform, opacity;
isolation: isolate;
contain: layout style;
overflow: hidden;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
text-rendering: optimizeLegibility;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--color-primary: #5b6cff;
--color-secondary: #ff6b6b;
--color-text: #1a1a1a;
--color-bg: #ffffff;
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-md: 0 4px 16px rgba(0, 0, 0, 0.06);
--transition-fast: 0.15s linear;
--transition-base: 0.2s ease-out;

&:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.08), 0 24px 64px rgba(0, 0, 0, 0.12);
  background-color: rgba(255, 255, 255, 0.98);
}

&:active {
  transform: translateY(0);
  transition-duration: 0.08s;
}

@media (min-width: 768px) {
  flex-direction: row;
  padding: 24px 32px;
  gap: 24px;
  font-size: 15px;
  border-radius: 16px;
}

@media (min-width: 1200px) {
  padding: 32px 48px;
  gap: 32px;
  font-size: 16px;
  max-width: 1400px;
}

@media (prefers-color-scheme: dark) {
  color: #f5f5f5;
  background-color: #1a1a1a;
  background-image: linear-gradient(180deg, rgba(26, 26, 26, 0.95) 0%, rgba(16, 16, 20, 0.85) 100%);
  border-color: rgba(255, 255, 255, 0.08);
}

@media (prefers-reduced-motion: reduce) {
  transition: none;
  animation: none;
}

@supports (backdrop-filter: blur(10px)) {
  backdrop-filter: blur(10px) saturate(1.5);
  background-color: rgba(255, 255, 255, 0.7);
}
`;

// Huge: ~10kB. 200+ decls, 5 @media, 3 @supports, several nested rules,
// multiple @keyframes. Representative of a whole component library module
// bundled into one template.
const CSS_HUGE = (() => {
  const blocks: string[] = [];
  for (let i = 0; i < 4; i++) {
    blocks.push(CSS_LARGE);
    blocks.push(`
      @keyframes anim${i} {
        0% { opacity: 0; transform: scale(0.95) translateY(16px); }
        40% { opacity: 0.7; transform: scale(1.02) translateY(-2px); }
        70% { opacity: 0.9; }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }
    `);
    blocks.push(`
      &[data-variant="v${i}"] {
        color: hsl(${i * 90}, 70%, 50%);
        border-color: hsl(${i * 90}, 70%, 40%);
        &:hover { color: hsl(${i * 90}, 80%, 60%); }
        &:focus-visible { outline: 2px solid hsl(${i * 90}, 70%, 50%); }
      }
    `);
  }
  return blocks.join('\n');
})();

// Commas-heavy: transitions + shadows + gradients. Stresses stripCommaSpaces.
const CSS_COMMA_HEAVY = `
transition: transform 0.2s ease-out, opacity 0.3s linear, background-color 0.15s linear, box-shadow 0.2s ease-in-out, color 0.2s linear;
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.06), 0 4px 8px rgba(0, 0, 0, 0.08), 0 8px 16px rgba(0, 0, 0, 0.10), 0 16px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1);
background: linear-gradient(135deg, rgba(255, 0, 100, 0.8) 0%, rgba(100, 0, 255, 0.6) 33%, rgba(0, 255, 200, 0.4) 66%, rgba(255, 200, 0, 0.6) 100%);
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
animation: slide 0.3s ease-out, fade 0.5s linear, bounce 0.8s cubic-bezier(0.2, 0, 0, 1);
`;

// Full stylis pipeline (preprocess + compile + serialize with rulesheet)
function stylisFull(css: string): string[] {
  const out: string[] = [];
  stylis.serialize(
    stylis.compile(`.a{${preprocessCSS(css)}}`),
    stylis.middleware([stylis.stringify, stylis.rulesheet(v => out.push(v))])
  );
  return out;
}

function parserFull(css: string): string[] {
  return emitWeb(parse(preprocessCSS(css)), '.a');
}

/**
 * Use fast path when cheap indexOf pre-check confirms flat CSS.
 * indexOf is SIMD-backed on V8, far cheaper than byte-walking.
 */
function parserHybrid(css: string): string[] {
  const pp = preprocessCSS(css);
  if (pp.indexOf('{') === -1 && pp.indexOf('@') === -1) {
    const fast = parseEmitFlat(pp, '.a');
    if (fast !== null) return fast;
  }
  const ast = parse(pp);
  return emitWeb(ast, '.a');
}

describe('parser pipeline vs stylis pipeline', () => {
  it('parses + emits CSS_TINY', () => {
    console.log('\n--- CSS_TINY ---');
    bench('parser AST path             ', 50000, () => {
      parserFull(CSS_TINY);
    });
    bench('parser hybrid (fast+AST)    ', 50000, () => {
      parserHybrid(CSS_TINY);
    });
    bench('stylis (compile + serialize)', 50000, () => {
      stylisFull(CSS_TINY);
    });
  });

  it('parses + emits CSS_SMALL', () => {
    console.log('\n--- CSS_SMALL ---');
    bench('parser AST path             ', 30000, () => {
      parserFull(CSS_SMALL);
    });
    bench('parser hybrid (fast+AST)    ', 30000, () => {
      parserHybrid(CSS_SMALL);
    });
    bench('stylis (compile + serialize)', 30000, () => {
      stylisFull(CSS_SMALL);
    });
  });

  it('parses + emits CSS_MEDIUM', () => {
    console.log('\n--- CSS_MEDIUM ---');
    bench('parser AST path             ', 10000, () => {
      parserFull(CSS_MEDIUM);
    });
    bench('parser hybrid (fast+AST)    ', 10000, () => {
      parserHybrid(CSS_MEDIUM);
    });
    bench('stylis (compile + serialize)', 10000, () => {
      stylisFull(CSS_MEDIUM);
    });
  });

  it('parses + emits CSS_MEDIA_NESTED', () => {
    console.log('\n--- CSS_MEDIA_NESTED (fast-path bails, uses AST) ---');
    bench('parser AST path             ', 10000, () => {
      parserFull(CSS_MEDIA_NESTED);
    });
    bench('parser hybrid (fast+AST)    ', 10000, () => {
      parserHybrid(CSS_MEDIA_NESTED);
    });
    bench('stylis (compile + serialize)', 10000, () => {
      stylisFull(CSS_MEDIA_NESTED);
    });
  });

  it('parses + emits CSS_KEYFRAMES', () => {
    console.log('\n--- CSS_KEYFRAMES (fast-path bails on @) ---');
    bench('parser AST path             ', 10000, () => {
      parserFull(CSS_KEYFRAMES);
    });
    bench('parser hybrid (fast+AST)    ', 10000, () => {
      parserHybrid(CSS_KEYFRAMES);
    });
    bench('stylis (compile + serialize)', 10000, () => {
      stylisFull(CSS_KEYFRAMES);
    });
  });

  it('parses + emits CSS_LARGE', () => {
    console.log(`\n--- CSS_LARGE (${CSS_LARGE.length}B, real-world component) ---`);
    bench('parser AST path             ', 2000, () => {
      parserFull(CSS_LARGE);
    });
    bench('parser hybrid (fast+AST)    ', 2000, () => {
      parserHybrid(CSS_LARGE);
    });
    bench('stylis (compile + serialize)', 2000, () => {
      stylisFull(CSS_LARGE);
    });
  });

  it('parses + emits CSS_HUGE', () => {
    console.log(`\n--- CSS_HUGE (${CSS_HUGE.length}B, library-scale bundle) ---`);
    bench('parser AST path             ', 500, () => {
      parserFull(CSS_HUGE);
    });
    bench('parser hybrid (fast+AST)    ', 500, () => {
      parserHybrid(CSS_HUGE);
    });
    bench('stylis (compile + serialize)', 500, () => {
      stylisFull(CSS_HUGE);
    });
  });

  it('parses + emits CSS_COMMA_HEAVY', () => {
    console.log(
      `\n--- CSS_COMMA_HEAVY (${CSS_COMMA_HEAVY.length}B, stresses comma normalization) ---`
    );
    bench('parser AST path             ', 10000, () => {
      parserFull(CSS_COMMA_HEAVY);
    });
    bench('parser hybrid (fast+AST)    ', 10000, () => {
      parserHybrid(CSS_COMMA_HEAVY);
    });
    bench('stylis (compile + serialize)', 10000, () => {
      stylisFull(CSS_COMMA_HEAVY);
    });
  });

  it('produces equivalent output', () => {
    // Sanity check: for each sample, both pipelines return byte-identical output.
    // This is the parity guarantee the full parity.test.ts enforces more broadly.
    for (const css of [
      CSS_TINY,
      CSS_SMALL,
      CSS_MEDIUM,
      CSS_MEDIA_NESTED,
      CSS_KEYFRAMES,
      CSS_LARGE,
      CSS_HUGE,
      CSS_COMMA_HEAVY,
    ]) {
      expect(parserFull(css)).toEqual(stylisFull(css));
      expect(parserHybrid(css)).toEqual(stylisFull(css));
    }
  });
});
