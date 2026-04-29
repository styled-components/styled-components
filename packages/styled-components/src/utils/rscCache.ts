import React from 'react';
import { IS_RSC } from './isRsc';

/** Create a per-render cached factory via React.cache (React 19+). Returns null when not in RSC. */
export function createRSCCache<T>(factory: () => T): (() => T) | null {
  if (!IS_RSC) return null;
  const reactCache: (<F extends (...args: any[]) => any>(fn: F) => F) | undefined = (React as any)
    .cache;
  return reactCache ? reactCache(factory) : null;
}
