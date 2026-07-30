/**
 * Incremental cost of first-party plugins on a realistic stylesheet.
 *
 * Compares createCompiler with no plugins vs [rtlPlugin] vs [prefixPlugin]
 * on the same corpus so prefix cost is judged relative to an existing plugin.
 *
 * Run: pnpm --filter styled-components bench:web -- plugins.bench
 */

import createCompiler from '../utils/compiler';
import { prefixPlugin } from '../plugins';
import rtlPlugin from '../plugins/rtl';
import { bench as _bench } from './bench-utils';

const opts = { runs: 7, precision: 2, nameWidth: 56 };
const bench = (name: string, iterations: number, fn: (i: number) => void) =>
  _bench(name, iterations, fn, opts);

/**
 * Representative component CSS: mostly already-unprefixed properties at the
 * React JS floor, plus a few that still need prefixes (appearance, filter,
 * user-select, backdrop-filter, sticky, placeholder).
 */
const CSS_REALISTIC = `
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
padding: 16px 24px;
margin: 0 auto;
max-width: 1200px;
font-size: 14px;
line-height: 1.5;
color: #333;
background-color: #fff;
border: 1px solid #e0e0e0;
border-radius: 8px;
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
transition: opacity 0.2s ease, transform 0.2s ease;
transform: translateY(0);
appearance: none;
user-select: none;
filter: blur(0);
backdrop-filter: blur(4px);
position: sticky;
top: 0;
&:hover {
  transform: translateY(-2px);
  background-color: #f5f5f5;
}
&::placeholder {
  color: #999;
}
@media (min-width: 768px) {
  padding: 24px 32px;
  font-size: 16px;
}
`;

const none = createCompiler();
const withRtl = createCompiler({ plugins: [rtlPlugin] });
const withPrefix = createCompiler({ plugins: [prefixPlugin] });

/** Pass-through-only CSS: nothing in the prefix table, nothing for rtl to swap. */
const CSS_PASSTHROUGH = `
display: flex;
flex-direction: column;
padding: 16px 24px;
margin: 0 auto;
max-width: 1200px;
font-size: 14px;
line-height: 1.5;
color: #333;
background-color: #fff;
border-radius: 8px;
transition: opacity 0.2s ease;
transform: translateY(0);
&:hover {
  background-color: #f5f5f5;
}
@media (min-width: 768px) {
  padding: 24px 32px;
}
`;

describe('plugin incremental cost', () => {
  it('compile realistic CSS: none vs rtl vs prefix', () => {
    const n = 8000;

    const tNone = bench('realistic / no plugins', n, () => {
      none.compile(CSS_REALISTIC, '.a', undefined, 'a');
    });
    const tRtl = bench('realistic / rtlPlugin', n, () => {
      withRtl.compile(CSS_REALISTIC, '.a', undefined, 'a');
    });
    const tPrefix = bench('realistic / prefixPlugin', n, () => {
      withPrefix.compile(CSS_REALISTIC, '.a', undefined, 'a');
    });

    // Soft guard: prefix should stay in the same ballpark as rtl on this
    // corpus. Fail loudly only on a large regression (2.5x rtl delta).
    const rtlDelta = tRtl - tNone;
    const prefixDelta = tPrefix - tNone;
    if (rtlDelta > 0) {
      expect(prefixDelta).toBeLessThan(rtlDelta * 2.5 + tNone * 0.05);
    }
  });

  it('compile pass-through CSS: prefix miss path vs rtl', () => {
    const n = 12000;

    const tNone = bench('passthrough / no plugins', n, () => {
      none.compile(CSS_PASSTHROUGH, '.a', undefined, 'a');
    });
    const tRtl = bench('passthrough / rtlPlugin', n, () => {
      withRtl.compile(CSS_PASSTHROUGH, '.a', undefined, 'a');
    });
    const tPrefix = bench('passthrough / prefixPlugin', n, () => {
      withPrefix.compile(CSS_PASSTHROUGH, '.a', undefined, 'a');
    });

    // Miss path should not be materially worse than rtl's miss path.
    const rtlDelta = Math.max(0, tRtl - tNone);
    const prefixDelta = Math.max(0, tPrefix - tNone);
    expect(prefixDelta).toBeLessThan(rtlDelta * 2 + tNone * 0.08);
  });
});
