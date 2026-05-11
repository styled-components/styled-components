/**
 * Set a key on a Map, evicting the oldest entry first if the Map has
 * reached `limit`. JavaScript Maps preserve insertion order, so
 * `keys().next().value` is the oldest entry. Used by per-instance LRU-ish
 * caches across the parser, web style, and native style paths to keep
 * memory bounded under unbounded interpolation variation.
 */
export function fifoSet<K, V>(map: Map<K, V>, key: K, value: V, limit: number): void {
  if (map.size >= limit) {
    const oldest = map.keys().next().value;
    if (oldest !== undefined) map.delete(oldest);
  }
  map.set(key, value);
}
