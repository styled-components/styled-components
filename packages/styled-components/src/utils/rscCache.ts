import React from 'react';
import { IS_RSC } from './isRsc';

export function createRSCCache<T>(factory: () => T): (() => T) | null {
  if (!IS_RSC) return null;
  // Preserve the original factory signature through React.cache's generic.
  const reactCache: typeof React.cache | undefined = React.cache;
  return reactCache ? reactCache(factory) : null;
}
