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

/**
 * Dev-time scan for createTheme sentinel tokens that survived the
 * resolver pipeline and would otherwise reach RN as opaque strings.
 *
 * A "leak" is a sentinel whose `\0` start is glued to a preceding
 * non-boundary character, indicating the sentinel was concatenated with
 * something else in JS land — typically `${p => 47 + t.space.xl}` style
 * arithmetic that coerced the sentinel to a string before the runtime
 * resolver could see it. Boundary characters (whitespace, comma, paren,
 * slash) are normal sentinel separators in multi-value contexts (e.g.
 * `border: ${t.borderWidth} solid ${t.colors.ink}`) and must NOT trigger
 * the warning.
 *
 * Production builds tree-shake this function out via the
 * `process.env.NODE_ENV` guard at the call site.
 */
export function warnIfSentinelLeak(prop: string, value: unknown): void {
  if (typeof value !== 'string') return;
  const len = value.length;
  for (let i = 0; i < len; i++) {
    if (value.charCodeAt(i) !== 0) continue;
    if (i === 0) continue;
    const prev = value.charCodeAt(i - 1);
    if (
      prev === 0x20 || // space
      prev === 0x09 || // tab
      prev === 0x0a || // newline
      prev === 0x0d || // CR
      prev === 0x2c || // ,
      prev === 0x28 || // (
      prev === 0x29 || // )
      prev === 0x2f // /
    ) {
      continue;
    }
    warnOnce(
      `sentinel-leak:${prop}`,
      `A createTheme token leaked into the value of "${prop}" as part of a larger JS expression and won't resolve at render time. ` +
        `Common cause: \`\${p => p.x + t.space.xl}\` style arithmetic — the JS \`+\` coerces the sentinel to a string. ` +
        `Use \`calc(\${p.x}px + \${t.space.xl}px)\` instead so the engine resolves both arms against the active ThemeProvider.`
    );
    return;
  }
}
