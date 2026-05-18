/**
 * Flatten `resolved` from `assembleFinalStyle` / `composeBase` into one
 * object (arrays of layers are merged in order; functions are not expanded).
 */
export function flattenResolvedStyle(resolved: unknown): Record<string, unknown> {
  const style: Record<string, unknown> = {};
  if (Array.isArray(resolved)) {
    for (let i = 0; i < resolved.length; i++) {
      const entry = resolved[i];
      if (entry != null && typeof entry === 'object') Object.assign(style, entry as object);
    }
  } else if (resolved != null && typeof resolved === 'object') {
    Object.assign(style, resolved as object);
  }
  return style;
}
