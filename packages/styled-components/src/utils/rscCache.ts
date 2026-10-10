import React from 'react';
import { IS_RSC } from './isRsc';

export function createRSCCache<T>(factory: () => T): (() => T) | null {
  if (!IS_RSC) return null;
  // Preserve the original factory signature through React.cache's generic.
  const reactCache: typeof React.cache | undefined = React.cache;
  return reactCache ? reactCache(factory) : null;
}

/** Everything the server-component emission path remembers for one request. */
export type RscRequestState = {
  /** Compiled rules keyed `componentId + '\0' + name`, so an instance whose name claim failed can still emit them. */
  compiledRules: Map<string, string[]>;
  /** Development only: `<style>` tags emitted per component or global style ID. */
  emitCounts: Map<string, number>;
  /**
   * `<style>` elements keyed by the owning component plus the exact CSS text.
   * Every instance still renders its own tag; handing each repeat the same
   * element object lets the server-component payload write the style once and
   * refer back to it.
   */
  styleElements: Map<string, React.ReactElement>;
};

/**
 * One request-scoped record behind a single `React.cache` lookup. Null
 * outside a server bundle so browser and native builds drop it.
 */
export const getRscRequestState: (() => RscRequestState) | null = IS_RSC
  ? createRSCCache(
      (): RscRequestState => ({
        compiledRules: new Map(),
        emitCounts: new Map(),
        styleElements: new Map(),
      })
    )
  : null;

/** Count one more tag emitted for `id` in this request and return the running total. */
export function noteRscEmit(state: RscRequestState, id: string): number {
  const count = (state.emitCounts.get(id) || 0) + 1;
  state.emitCounts.set(id, count);

  return count;
}
