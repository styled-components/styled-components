// High-resolution timer. RN 0.83+ exposes performance.now() globally as
// a Web Performance API; Date.now fallback for older RN versions.
declare const performance: { now(): number } | undefined;

export function now(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}
