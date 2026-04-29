/**
 * Standalone profile harness for the parser on large inputs.
 *
 * Run with (from `packages/styled-components`; optional `--cpu-prof-dir=./.cpu-profiles`):
 *   bun --cpu-prof --cpu-prof-md --cpu-prof-name=parser-profile --cpu-prof-dir=./.cpu-profiles \
 *     src/parser/profile-harness.ts
 *
 * `--cpu-prof-md` emits a markdown CPU profile; `--cpu-prof` also writes a
 * `.cpuprofile` for Chrome. See AGENTS.md (Profiling / Bun). Targets hot
 * functions in the AST path on large inputs where the parser-vs-stylis margin narrows.
 */

import { emitWeb } from './emit-web';
import { parse } from './parser';
import { preprocessCSS } from '../utils/preprocessCSS';

// Reuse the CSS_LARGE and CSS_HUGE shapes from the bench. Inlined here so the
// harness can run standalone without the jest bench infra.
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

&:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.08);
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
  border-color: rgba(255, 255, 255, 0.08);
}

@supports (backdrop-filter: blur(10px)) {
  backdrop-filter: blur(10px) saturate(1.5);
  background-color: rgba(255, 255, 255, 0.7);
}
`;

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

function run(css: string, iterations: number): void {
  // Warmup
  for (let i = 0; i < Math.min(iterations / 10, 200); i++) {
    emitWeb(parse(preprocessCSS(css)), '.a');
  }
  // Measured
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    emitWeb(parse(preprocessCSS(css)), '.a');
  }
  const elapsed = performance.now() - start;
  const ops = (iterations / elapsed) * 1000;
  // eslint-disable-next-line no-console
  console.log(
    `  ${css.length}B × ${iterations}: ${elapsed.toFixed(2)}ms total, ${Math.round(ops).toLocaleString()} ops/s`
  );
}

// eslint-disable-next-line no-console
console.log('--- CSS_LARGE profile ---');
run(CSS_LARGE, 3000);

// eslint-disable-next-line no-console
console.log('--- CSS_HUGE profile ---');
run(CSS_HUGE, 800);
