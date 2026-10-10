import React from 'react';
import { IS_RSC } from './isRsc';

export function createRSCCache<T>(factory: () => T): (() => T) | null {
  if (!IS_RSC) return null;
  // Preserve the original factory signature through React.cache's generic.
  const reactCache: typeof React.cache | undefined = React.cache;
  return reactCache ? reactCache(factory) : null;
}

/**
 * Request-scoped `<style>` elements keyed by the owning component plus the
 * exact CSS text. Every server-rendered instance still renders its own tag;
 * handing each repeat the same element object lets the server-component
 * payload write the style once and refer back to it. Null outside a server
 * bundle so browser and native builds drop it.
 */
export const getRscStyleElements: (() => Map<string, React.ReactElement>) | null = IS_RSC
  ? createRSCCache(() => new Map<string, React.ReactElement>())
  : null;
