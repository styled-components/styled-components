/**
 * CSS preprocessing throughput at different scales.
 *
 * Measures preprocessCSS (comment stripping + brace validation) in isolation,
 * and the full stylis pipeline (preprocess + compile + serialize) to show
 * how preprocessing cost relates to total compilation.
 *
 * Run: npx jest -c jest.config.bench.js -- preprocess
 */

import { preprocessCSS } from '../utils/cssCompile';
import createStylisInstance from '../utils/cssCompile';
import { bench as _bench } from './bench-utils';

const ppOpts = { runs: 7, precision: 2 };
const bench = (name: string, iterations: number, fn: (i: number) => void) =>
  _bench(name, iterations, fn, ppOpts);

// --- Inputs at increasing scale ---

const CSS_SMALL = `
  display: flex;
  color: #333;
  font-size: 14px;
`;

const CSS_MEDIUM = `
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 24px;
  margin: 0 auto;
  max-width: 1200px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease-in-out;
`;

const CSS_MEDIUM_COMMENTED = `
  display: flex; // layout
  flex-direction: column;
  // center everything
  align-items: center;
  justify-content: center;
  padding: 16px 24px; // responsive padding
  margin: 0 auto;
  max-width: 1200px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px; // base size
  line-height: 1.5;
  color: #333;
  background-color: #fff; // TODO: use theme
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease-in-out; // smooth
`;

const CSS_COMPLEX = `
  background-image: url(https://cdn.example.com/bg.png); // hero bg
  cursor: url(https://cdn.example.com/cursor.cur), auto;
  /* Design spec: http://design.example.com/spec#hero */
  font-face: url(https://fonts.example.com/roboto.woff2) format('woff2');
  content: "http://not-a-url"; // but this is a comment
  border-image: url(https://cdn.example.com/border.png) 30 round;
`;

const CSS_LARGE = Array.from(
  { length: 20 },
  (_, i) => `
  .item-${i} {
    display: flex;
    padding: ${8 + i}px;
    color: hsl(${i * 18}, 70%, 50%);
    background: linear-gradient(135deg, hsl(${i * 18}, 70%, 95%), hsl(${i * 18}, 70%, 85%));
    border-radius: 4px;
    // variant ${i} styles
    font-size: ${12 + i}px;
    transition: transform 0.2s ease;
    &:hover {
      transform: scale(1.02);
    }
  }
`
).join('\n');

describe('preprocessing benchmarks', () => {
  it('preprocessCSS isolated throughput', () => {
    const N = 200_000;
    console.log(`\n--- preprocessCSS isolated (${N.toLocaleString()} iterations, median of 7) ---`);

    bench('small (3 decls, no comments)', N, () => preprocessCSS(CSS_SMALL));
    bench('medium (16 decls, no comments)', N, () => preprocessCSS(CSS_MEDIUM));
    bench('medium (16 decls, 6 line comments)', N, () => preprocessCSS(CSS_MEDIUM_COMMENTED));
    bench('complex (urls + strings + block + line)', N, () => preprocessCSS(CSS_COMPLEX));
    bench('large (20 nested rules + comments)', 20_000, () => preprocessCSS(CSS_LARGE));
  });

  it('full stylis pipeline (preprocess + compile + serialize)', () => {
    const stylis = createStylisInstance();
    const N = 50_000;
    console.log(`\n--- full stylis pipeline (${N.toLocaleString()} iterations, median of 7) ---`);

    bench('small (3 decls, no comments)', N, () => stylis(CSS_SMALL, '.a', '', '&'));
    bench('medium (16 decls, no comments)', N, () => stylis(CSS_MEDIUM, '.a', '', '&'));
    bench('medium (16 decls, 6 line comments)', N, () =>
      stylis(CSS_MEDIUM_COMMENTED, '.a', '', '&')
    );
    bench('complex (urls + strings + block + line)', N, () => stylis(CSS_COMPLEX, '.a', '', '&'));
    bench('large (20 nested rules + comments)', 5_000, () => stylis(CSS_LARGE, '.a', '', '&'));
  });
});
