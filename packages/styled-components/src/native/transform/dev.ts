const warned = new Set<string>();

/**
 * Emit a one-time dev warning, keyed by message. Build-time
 * `process.env.NODE_ENV !== 'production'` guard allows terser/rollup
 * to drop the whole call in prod bundles.
 */
export function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(`[styled-components/native] ${message}`);
  }
}

/**
 * Test-only reset. Does nothing in production because warnings are
 * already suppressed there.
 */
export function resetWarningsForTest(): void {
  warned.clear();
}
