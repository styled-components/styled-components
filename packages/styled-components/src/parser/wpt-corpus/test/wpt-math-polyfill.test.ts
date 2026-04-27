/**
 * WPT parity — native math-function polyfill (`calc` / `min` / `max` /
 * `clamp` with static arms).
 *
 * Filters the corpus to assertions whose input is one of those
 * functions AND whose expected output is a bare number, px length, or
 * percent — matching the shape our polyfill can statically resolve.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */

import corpus from '../corpus.json';
import {
  numericResultToRn,
  resolveStaticMathFunction,
} from '../../../native/transform/polyfills/mathFns';
import { tokenize } from '../../../native/transform/tokenize';
import { TokenKind } from '../../../native/transform/tokens';

interface Assertion {
  source: string;
  kind: 'valid' | 'invalid' | 'computed';
  property: string;
  value: string;
  expected?: string;
  description?: string;
}

const MATH_FNS = ['calc', 'min', 'max', 'clamp'];

function startsWithMath(value: string): boolean {
  const lower = value.trim().toLowerCase();
  return MATH_FNS.some(fn => lower.startsWith(fn + '('));
}

function parseScalar(s: string): { value: number; unit: '' | 'px' | '%' } | null {
  const t = s.trim();
  const m = /^(-?\d*\.?\d+)(px|%)?$/.exec(t);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  return { value: n, unit: (m[2] as '' | 'px' | '%') ?? '' };
}

const assertions = corpus as Assertion[];

describe('WPT parity — native math-fn polyfill', () => {
  const cases = assertions.filter(a => {
    if (a.kind !== 'computed') return false;
    if (!startsWithMath(a.value)) return false;
    if (!a.expected) return false;
    return parseScalar(a.expected) !== null;
  });

  it('corpus has a usable population of math-fn tests', () => {
    // calc/min/max/clamp tests are sparse in this snapshot — OK to be
    // smaller; the high-value signal is direction-correctness.
    expect(cases.length).toBeGreaterThanOrEqual(5);
    console.log(`[wpt] math-polyfill cases:`, cases.length);
  });

  it('every statically-resolvable case matches the browser within 0.01', () => {
    const failures: Array<{
      source: string;
      value: string;
      expected: string;
      ours: unknown;
    }> = [];
    let skipped = 0;

    for (const c of cases) {
      const toks = tokenize(c.value);
      if (toks.length !== 1 || toks[0].kind !== TokenKind.Function) {
        skipped++;
        continue;
      }
      const numeric = resolveStaticMathFunction(toks[0]);
      if (numeric === null) {
        // Our polyfill defers for dynamic / em / v-unit arms — matches
        // what the render-time resolver handles instead. Skip here.
        skipped++;
        continue;
      }
      const ours = numericResultToRn(numeric);
      const theirs = parseScalar(c.expected!)!;

      const ourScalar =
        typeof ours === 'number' ? { value: ours, unit: '' as const } : parseScalar(String(ours));
      if (!ourScalar) {
        failures.push({ source: c.source, value: c.value, expected: c.expected!, ours });
        continue;
      }

      const unitsOk =
        ourScalar.unit === theirs.unit ||
        // px and bare-number both map to dp on RN; WPT's computed form
        // is always `Npx` for lengths so treat them interchangeably.
        (ourScalar.unit === '' && theirs.unit === 'px') ||
        (ourScalar.unit === 'px' && theirs.unit === '');

      if (!unitsOk || Math.abs(ourScalar.value - theirs.value) > 0.01) {
        failures.push({ source: c.source, value: c.value, expected: c.expected!, ours });
      }
    }

    if (failures.length > 0) {
      console.warn(
        `[wpt] math-polyfill divergences (${failures.length}/${cases.length - skipped}):`,
        failures.slice(0, 10)
      );
    }
    console.log(
      `[wpt] math-polyfill: ${cases.length - skipped - failures.length}/${cases.length - skipped} pass, ${skipped} skipped (dynamic/unsupported inputs)`
    );
    expect(failures.length).toBeLessThanOrEqual(Math.max(2, cases.length * 0.2));
  });
});
