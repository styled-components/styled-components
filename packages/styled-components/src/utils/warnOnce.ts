const warned: Set<string> = new Set();

/** Compute the dedupe key from `code` + optional `dedupeSuffix`. */
export function warnKey(code: string, dedupeSuffix?: string): string {
  return dedupeSuffix !== undefined ? code + ':' + dedupeSuffix : code;
}

/** True if a warning with this key has already fired this process. */
export function hasWarned(key: string): boolean {
  return warned.has(key);
}

/**
 * Emit a `[sc] ...` warning at most once for the lifetime of the module.
 *
 * - `code` is the internal dedupe key (e.g. `unknown-prop`, `withTheme`).
 *   It does NOT appear in the printed message; callers wrap the user-facing
 *   text with whatever framing the warning needs.
 * - `dedupeSuffix` (optional) makes the dedupe per-instance, e.g.
 *   `unknown-prop` should warn once per offending prop name, not once total.
 */
export function warnOnce(code: string, message: string, dedupeSuffix?: string): void {
  const key = warnKey(code, dedupeSuffix);
  if (warned.has(key)) return;
  warned.add(key);
  console.warn('[sc] ' + message);
}

/** Test-only: clear the dedupe set so repeated assertions can re-trigger warnings. */
export function resetWarnOnce(): void {
  warned.clear();
}
