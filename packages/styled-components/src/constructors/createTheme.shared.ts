/**
 * Shared helpers for the web (`createTheme.ts`) and native
 * (`createTheme.native.ts`) entry points. Imported by both — keeps the
 * tree-walking + path concatenation logic in one place so changes
 * stay coherent across platforms.
 */

/**
 * Recursive theme traversal. For each leaf value, calls `leafFn(path, val)`
 * and writes the return into `result` at the matching key. Nested objects
 * recurse, accumulating `path` segments separated by `separator`.
 *
 * Web uses `-` (CSS-friendly: `--sc-colors-bg`).
 * Native uses `.` (dot-path-friendly: `colors.bg`).
 */
export function walkTheme(
  obj: Record<string, any>,
  separator: string,
  result: Record<string, any>,
  leafFn: (fullPath: string, val: any) => any,
  path?: string
): void {
  for (const key in obj) {
    const val = obj[key];
    const fullPath = path ? path + separator + key : key;
    if (typeof val === 'object' && val !== null) {
      const nested: Record<string, any> = {};
      walkTheme(val, separator, nested, leafFn, fullPath);
      result[key] = nested;
    } else {
      result[key] = leafFn(fullPath, val);
    }
  }
}
