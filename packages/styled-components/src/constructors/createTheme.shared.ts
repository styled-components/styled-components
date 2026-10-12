/**
 * Shared helpers for the web (`createTheme.ts`) and native
 * (`createTheme.native.ts`) entry points. Imported by both; keeps the
 * tree-walking + path concatenation logic in one place so changes
 * stay coherent across platforms.
 */

import type { Dict } from '../types';

/** True for any non-null object: the nodes a theme walk recurses into. */
export function isThemeBranch(value: unknown): value is Dict<unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Recursive theme traversal. For each leaf value, calls `leafFn(path, val)`
 * and writes the return into `result` at the matching key. Nested objects
 * recurse, accumulating `path` segments separated by `separator`.
 *
 * Web uses `-` (CSS-friendly: `--sc-colors-bg`).
 * Native uses `.` (dot-path-friendly: `colors.bg`).
 */
export function walkTheme(
  obj: Dict<unknown>,
  separator: string,
  result: Dict<unknown>,
  leafFn: (fullPath: string, val: unknown) => unknown,
  path?: string
): void {
  for (const key in obj) {
    const val = obj[key];
    const fullPath = path ? path + separator + key : key;
    if (isThemeBranch(val)) {
      const nested: Dict<unknown> = {};
      walkTheme(val, separator, nested, leafFn, fullPath);
      result[key] = nested;
    } else {
      result[key] = leafFn(fullPath, val);
    }
  }
}
