import React from 'react';
import { IS_RSC } from './isRsc';

/** Create a per-render cached factory via React.cache (React 19+). Returns null when not in RSC. */
export function createRSCCache<T>(factory: () => T): (() => T) | null {
  if (!IS_RSC) return null;
  // `React.cache` is React 19's own per-request memoizer; the function type is
  // `<F extends Function>(fn: F): F`, so we keep the original signature.
  const reactCache: typeof React.cache | undefined = React.cache;
  return reactCache ? reactCache(factory) : null;
}
