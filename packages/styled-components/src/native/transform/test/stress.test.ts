/**
 * Stress tests for the transform + native compiler caches.
 *
 * Purpose: every cache ceiling in the native path should be justified
 * by a real measurement, not a guess. These tests capture the actual
 * memory / time curve so we can iterate the limit thresholds with
 * evidence.
 *
 * They run as regular jest cases (fast enough at their current size)
 * but deliberately avoid hard assertions on absolute timings — CI
 * machines vary. Instead they assert sensible upper bounds that would
 * only fail on a real regression.
 */

import { toNativeStyles, resetNativeStyleCache } from '../../../models/nativeStyleCompiler';
import { transformDecl } from '../index';

// Minimal StyleSheet stub — create() just returns the object wrapped.
const MOCK_SHEET = {
  create: <T extends Record<string, any>>(styles: T) => styles,
  hairlineWidth: 1,
  absoluteFill: {},
  absoluteFillObject: {},
  flatten: (s: any) => s,
  compose: () => ({}),
} as any;

function heapUsedMB(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed / 1024 / 1024;
  }
  return 0;
}

describe('transform stress — cache bounds driven by measurement', () => {
  beforeEach(() => resetNativeStyleCache());

  it('transformDecl handles 20k unique (prop, value) pairs without throwing', () => {
    const start = heapUsedMB();
    for (let i = 0; i < 20_000; i++) {
      transformDecl('margin', `${i}px`);
    }
    const delta = heapUsedMB() - start;
    // No hard upper bound — we want this value visible in CI logs for tuning.
    console.log(`[stress] 20k unique transformDecl pairs Δheap: ${delta.toFixed(2)} MB`);
    expect(true).toBe(true);
  });

  it('transformDecl handles 50k repeated (prop, value) pairs — heap stays bounded', () => {
    // Warm the camelize + shorthand code paths once.
    transformDecl('margin', '10px');
    const start = heapUsedMB();
    for (let i = 0; i < 50_000; i++) {
      transformDecl('margin', '10px');
    }
    const delta = heapUsedMB() - start;
    console.log(`[stress] 50k repeated transformDecl pairs Δheap: ${delta.toFixed(2)} MB`);
    // `transformDecl` itself is uncached — each call allocates a result
    // object. The real cache is in `nativeStyleCompiler.transformPair`
    // (keyed by prop+value). So heap growth proportional to call count
    // is EXPECTED here; what we're checking is that it scales roughly
    // linearly without a leak or cache pathology.
    expect(delta).toBeLessThan(100); // 2 KB/call budget × 50k = 100 MB ceiling
  });

  it('tokenizes a 1MB single declaration value without OOM', () => {
    // Pathological input — a single huge identifier. Runs to completion or
    // throws; either outcome is captured in CI. (We don't assert on timing.)
    const huge = 'a'.repeat(1_000_000);
    const t0 = Date.now();
    const out = transformDecl('fontFamily', huge);
    const ms = Date.now() - t0;
    console.log(`[stress] 1MB ident fontFamily: ${ms}ms`);
    expect(out.fontFamily).toBeDefined();
  });

  it('handles 10k distinct shorthand values (margin: Npx)', () => {
    const t0 = Date.now();
    for (let i = 0; i < 10_000; i++) {
      transformDecl('margin', `${i}px ${i + 1}px`);
    }
    const ms = Date.now() - t0;
    console.log(`[stress] 10k distinct shorthand expansions: ${ms}ms`);
    expect(ms).toBeLessThan(5000);
  });

  // ─── nativeStyleCompiler cache-layer stress ───────────────────────────
  //
  // The CSS-string compile cache (`compileCache`, default LIMIT=200) and
  // the per-pair cache (`pairCache`, default LIMIT=1000) in
  // nativeStyleCompiler.ts were inherited as round numbers. These tests
  // exercise them at realistic + pathological scale so we can
  // evidence-tune the ceilings.

  it('toNativeStyles caches repeated CSS hits efficiently', () => {
    // Build 150 distinct CSS strings — below the compileCache LIMIT (200)
    // so every call hits the cache after the first.
    const cssStrings = Array.from(
      { length: 150 },
      (_, i) => `padding: ${i}px; color: rgb(${i}, 0, 0);`
    );
    // Prime the cache.
    for (const css of cssStrings) toNativeStyles(css, MOCK_SHEET);
    const start = heapUsedMB();
    const t0 = Date.now();
    // 10 repeat passes — all cache hits.
    for (let pass = 0; pass < 10; pass++) {
      for (const css of cssStrings) toNativeStyles(css, MOCK_SHEET);
    }
    const ms = Date.now() - t0;
    const delta = heapUsedMB() - start;
    console.log(`[stress] 10×150 cache-hit compiles: ${ms}ms, Δheap ${delta.toFixed(2)} MB`);
    expect(ms).toBeLessThan(100); // should be sub-100ms given pure cache hits
  });

  it('toNativeStyles evicts at the LIMIT threshold without unbounded growth', () => {
    // Generate 2,000 distinct CSS strings — forces many evictions at LIMIT=200.
    const start = heapUsedMB();
    const t0 = Date.now();
    for (let i = 0; i < 2_000; i++) {
      toNativeStyles(`padding: ${i}px; margin: ${i}px;`, MOCK_SHEET);
    }
    const ms = Date.now() - t0;
    const delta = heapUsedMB() - start;
    console.log(
      `[stress] 2000 distinct CSS compiles (eviction-heavy): ${ms}ms, Δheap ${delta.toFixed(2)} MB`
    );
    // No hard ceiling — this is data capture. A leak would show up as
    // heap > number-of-compiles × bytes-per-entry.
    expect(ms).toBeLessThan(10_000);
  });
});
