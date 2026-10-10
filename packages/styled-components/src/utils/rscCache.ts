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

/**
 * Development only: per-request count of `<style>` tags emitted per component
 * or global style ID. `IS_RSC` leads the condition so a browser build, where
 * it is the literal `false`, drops the whole expression.
 */
const getRscEmitCounts: (() => Map<string, number>) | null =
  IS_RSC && __DEV__ ? createRSCCache(() => new Map<string, number>()) : null;

/** Count one more tag emitted for `id` in this request and return the running total (0 when not counting). */
export function noteRscEmit(id: string): number {
  const counts = getRscEmitCounts ? getRscEmitCounts() : null;
  if (counts === null) return 0;

  const count = (counts.get(id) || 0) + 1;
  counts.set(id, count);

  return count;
}
