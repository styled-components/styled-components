/**
 * Flatten `resolved` from `assembleFinalStyle` / `composeBase` into one
 * object. Arrays merge in order at any depth (later wins, falsy entries are
 * skipped, as React Native does); functions are not expanded.
 */
export function flattenResolvedStyle(resolved: unknown): Record<string, unknown> {
  const style: Record<string, unknown> = {};
  if (Array.isArray(resolved)) {
    assignLayers(style, resolved);
  } else if (resolved !== null && typeof resolved === 'object') {
    Object.assign(style, resolved);
  }
  return style;
}

/** The nested-array check sits in the entry loop so a flat array pays no extra call. */
function assignLayers(style: Record<string, unknown>, layers: unknown[]): void {
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (layer === null || typeof layer !== 'object') continue;
    if (Array.isArray(layer)) assignLayers(style, layer);
    else Object.assign(style, layer);
  }
}
