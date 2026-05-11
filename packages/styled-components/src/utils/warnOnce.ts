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
 * `code` is the dedupe key (not printed); `dedupeSuffix` makes dedupe
 * per-instance (e.g. once per offending prop name). No-op in production.
 */
export function warnOnce(code: string, message: string, dedupeSuffix?: string): void {
  if (!__DEV__) return;
  const key = warnKey(code, dedupeSuffix);
  if (warned.has(key)) return;
  warned.add(key);
  console.warn('[sc] ' + message);
}

/** Test-only: clear the dedupe set so repeated assertions can re-trigger warnings. */
export function resetWarnOnce(): void {
  warned.clear();
}
