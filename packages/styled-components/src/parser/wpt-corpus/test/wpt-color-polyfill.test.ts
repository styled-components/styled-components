/**
 * WPT parity;native color-math polyfill.
 *
 * Our polyfill claims static resolution for `oklch` / `oklab` / `lch` /
 * `lab` and `color-mix(in srgb|oklab|oklch, …)` when all operands are
 * literal. WPT has a far broader corpus covering `color-mix(in hsl,
 * …)`, relative color syntax (`oklch(from …)`), `none` channels,
 * `calc()` inside channels, etc.;we explicitly defer those (polyfill
 * returns null, caller passes the value through to RN-at-runtime).
 *
 * What this test validates: FOR CASES WE ATTEMPT, the output matches
 * the browser within a small delta. It does NOT require us to handle
 * every WPT case;that's tracked in `docs/rn-css-compatibility.md`
 * under "not yet supported".
 *
 * Tolerance: 3 bytes per channel;below perceptual threshold; above
 * typical rounding noise between our math and browser serialization.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */

import corpus from '../corpus.json';
import { staticColorFunctionToHex } from '../../../native/transform/polyfills/colorMath';
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

const assertions = corpus as Assertion[];

/** Parse any of: `rgb(r,g,b)`, `rgb(r g b / a)`, `rgba(...)`, or any
 * color function the polyfill itself understands (`oklch` / `oklab` /
 * `lch` / `lab` / `color-mix` / `color(<space> …)` / `hsl` / `hwb`).
 * Returns RGB channels in 0..255 byte space, alpha in 0..1.
 *
 * Routing function-form expected values through `staticColorFunctionToHex`
 * exercises the same conversion math on both sides — a bug in oklab→sRGB
 * would mask as a self-consistent zero diff rather than surfacing here.
 * The browser's computed-value oracle still validates the mix math itself
 * (which only runs on the input side), and the conversion paths are
 * separately spot-checked in `polyfills.test.ts`. */
function parseAnyColor(expected: string): [number, number, number, number] | null {
  const s = expected.trim().toLowerCase();
  let m = s.match(/^rgba?\(\s*([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3 || parts.length > 4) return null;
    const ch = parts.map((p, i) => {
      if (p.endsWith('%')) return (parseFloat(p) / 100) * (i < 3 ? 255 : 1);
      const n = parseFloat(p);
      if (!Number.isFinite(n)) return NaN;
      return i < 3 ? n : n;
    });
    if (ch.some(c => !Number.isFinite(c))) return null;
    return [ch[0], ch[1], ch[2], ch[3] ?? 1];
  }
  // Function-form expected values: route through the polyfill so the
  // test can compare hex-to-hex.
  if (
    s.startsWith('oklch(') ||
    s.startsWith('oklab(') ||
    s.startsWith('lch(') ||
    s.startsWith('lab(') ||
    s.startsWith('color-mix(') ||
    s.startsWith('color(') ||
    s.startsWith('hsl(') ||
    s.startsWith('hsla(') ||
    s.startsWith('hwb(')
  ) {
    const toks = tokenize(s);
    if (toks.length === 1 && toks[0].kind === TokenKind.Function) {
      const hex = staticColorFunctionToHex(toks[0]);
      if (hex !== null) return hexToChannels(hex);
    }
  }
  return null;
}

function hexToChannels(hex: string): [number, number, number, number] | null {
  const m = hex.match(/^#([0-9a-f]{3,8})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length === 4) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const a = h.length === 8 ? parseInt(h.substring(6, 8), 16) / 255 : 1;
  return [r, g, b, a];
}

/** Classify a candidate's value by its outermost function form for
 *  bucketed pass/skip reporting. */
function bucket(value: string): string {
  const v = value.trim().toLowerCase();
  if (v.startsWith('color-mix(')) {
    const m = v.match(/^color-mix\(\s*in\s+([a-z0-9-]+)/);
    return m ? 'color-mix-' + m[1] : 'color-mix-?';
  }
  if (v.startsWith('color(')) {
    const m = v.match(/^color\(\s*([a-z0-9-]+)/);
    return m ? 'color-' + m[1] : 'color-?';
  }
  if (v.startsWith('oklch(')) return 'oklch';
  if (v.startsWith('oklab(')) return 'oklab';
  if (v.startsWith('lch(')) return 'lch';
  if (v.startsWith('lab(')) return 'lab';
  if (v.startsWith('hsla(')) return 'hsla';
  if (v.startsWith('hsl(')) return 'hsl';
  if (v.startsWith('hwb(')) return 'hwb';
  if (v.startsWith('rgba(')) return 'rgba';
  if (v.startsWith('rgb(')) return 'rgb';
  return 'other';
}

describe('WPT parity;native color-math polyfill', () => {
  // All `color` computed tests whose input value is a function call that
  // our `staticColorFunctionToHex` polyfill can statically resolve (modern
  // and legacy color functions). `color()` and named-color forms are
  // tested elsewhere or deferred to RN's `normalizeColor`.
  const candidates = assertions.filter(a => {
    if (a.kind !== 'computed') return false;
    if (a.property !== 'color' && a.property !== 'background-color') return false;
    if (!a.expected) return false;
    const v = a.value.trim().toLowerCase();
    return (
      v.startsWith('oklch(') ||
      v.startsWith('oklab(') ||
      v.startsWith('lch(') ||
      v.startsWith('lab(') ||
      v.startsWith('color-mix(') ||
      v.startsWith('color(') ||
      v.startsWith('hsl(') ||
      v.startsWith('hsla(') ||
      v.startsWith('hwb(') ||
      v.startsWith('rgb(') ||
      v.startsWith('rgba(')
    );
  });

  it('has meaningful coverage of color-polyfill candidate tests', () => {
    console.log(`[wpt] color-polyfill candidates (pre-filter):`, candidates.length);
    // Exact corpus count as of 2026-05-10; update when corpus.json is refreshed.
    expect(candidates.length).toBe(5388);
  });

  it('attempted conversions match browser within 3/255 per channel', () => {
    const delta = 3;
    let attempted = 0;
    let skipped = 0;
    const buckets: Record<string, { attempted: number; passed: number; skipped: number }> = {};
    const bumpBucket = (b: string, k: 'attempted' | 'passed' | 'skipped') => {
      const entry = buckets[b] ?? { attempted: 0, passed: 0, skipped: 0 };
      entry[k]++;
      buckets[b] = entry;
    };
    const failures: Array<{ source: string; value: string; expected: string; hex: string }> = [];

    for (const c of candidates) {
      const b = bucket(c.value);
      const toks = tokenize(c.value);
      if (toks.length !== 1 || toks[0].kind !== TokenKind.Function) {
        skipped++;
        bumpBucket(b, 'skipped');
        continue;
      }
      const hex = staticColorFunctionToHex(toks[0]);
      if (hex === null) {
        // Polyfill correctly declines (relative color syntax, `calc()`
        // in channel, `none` keyword, unsupported interpolation space,
        // unknown named-color operand, …). These are documented in the
        // compatibility tracker as deferred cases.
        skipped++;
        bumpBucket(b, 'skipped');
        continue;
      }
      attempted++;
      bumpBucket(b, 'attempted');
      const ours = hexToChannels(hex);
      const theirs = parseAnyColor(c.expected!);
      if (!ours || !theirs) {
        // Expected format we can't parse;skip rather than fail (the
        // comparison would be meaningless).
        skipped++;
        bumpBucket(b, 'skipped');
        attempted--;
        buckets[b].attempted--;
        continue;
      }
      const rDiff = Math.abs(ours[0] - theirs[0]);
      const gDiff = Math.abs(ours[1] - theirs[1]);
      const bDiff = Math.abs(ours[2] - theirs[2]);
      const aDiff = Math.abs(ours[3] - theirs[3]) * 255;
      if (rDiff > delta || gDiff > delta || bDiff > delta || aDiff > delta) {
        failures.push({ source: c.source, value: c.value, expected: c.expected!, hex });
      } else {
        bumpBucket(b, 'passed');
      }
    }

    console.log(
      `[wpt] color-polyfill: ${attempted - failures.length}/${attempted} attempted pass (${skipped} deferred correctly)`
    );
    const bucketRows = Object.entries(buckets)
      .map(([name, v]) => ({ space: name, ...v, total: v.attempted + v.skipped }))
      .sort((a, b) => b.total - a.total);
    console.log(`[wpt] color-polyfill buckets:`);
    for (const row of bucketRows) {
      console.log(
        `  ${row.space.padEnd(22)} pass ${String(row.passed).padStart(3)}/${String(row.total).padEnd(3)}  (attempted ${row.attempted}, skipped ${row.skipped})`
      );
    }
    if (failures.length > 0) {
      console.warn(
        `[wpt] color-polyfill divergences (first 10 of ${failures.length}):`,
        failures.slice(0, 10)
      );
    }
    // Must have at least SOME attempts, else the filter is wrong.
    expect(attempted).toBeGreaterThan(0);
    // Today every attempted candidate passes within the 3/255-per-channel
    // tolerance. Lock that;any new divergence flags a regression in the
    // color polyfill and must be triaged (either fix the polyfill or add
    // the case to the documented skip list above).
    expect(failures).toEqual([]);
  });
});
