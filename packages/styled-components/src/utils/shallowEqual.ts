const hasOwn = Object.prototype.hasOwnProperty;

/**
 * Shallow-compare two context objects using a stored key count to avoid a
 * second iteration pass. Returns true if all own-property values match.
 *
 * Used by both web and native render impls to short-circuit the per-render
 * compute when props + theme reduce to the same context as the previous
 * render. Extracted to one place because the implementation is identical
 * across platforms.
 */
export default function shallowEqual(prev: object, next: object, prevKeyCount: number): boolean {
  const a = prev as Record<string, unknown>;
  const b = next as Record<string, unknown>;
  let nextKeyCount = 0;
  for (const key in b) {
    if (hasOwn.call(b, key)) {
      nextKeyCount++;
      if (a[key] !== b[key]) return false;
    }
  }
  return nextKeyCount === prevKeyCount;
}
