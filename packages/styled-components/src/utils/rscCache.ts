import React from 'react';
import type WebStyle from '../models/WebStyle';
import { LIMIT as TOO_MANY_CLASSES_LIMIT } from './createWarnTooManyClasses';
import { fifoSet } from './fifoMap';
import { IS_RSC } from './isRsc';

export function createRSCCache<T>(factory: () => T): (() => T) | null {
  if (!IS_RSC) return null;
  // Preserve the original factory signature through React.cache's generic.
  const reactCache: typeof React.cache | undefined = React.cache;
  return reactCache ? reactCache(factory) : null;
}

/**
 * Compiled rules per component and class name, shared by every request in the
 * process: a name hashes its CSS and the stylis configuration, so its rules
 * never change. A WeakMap keeps the data off WebStyle, so browser and native
 * bundles carry none of it, and frees it with the component.
 */
const compiledRules: WeakMap<WebStyle, Map<string, string[]>> | null = IS_RSC
  ? new WeakMap()
  : null;

/** Record the rules compiled for one class name of `webStyle`. */
export function rememberRscRules(webStyle: WebStyle, name: string, rules: string[]): void {
  if (compiledRules === null) return;

  let names = compiledRules.get(webStyle);
  if (names === undefined) {
    names = new Map();
    compiledRules.set(webStyle, names);
  }
  fifoSet(names, name, rules, TOO_MANY_CLASSES_LIMIT);
}

/** The rules a past render compiled for one class name of `webStyle`, if still held. */
export function recallRscRules(webStyle: WebStyle, name: string): string[] | undefined {
  return compiledRules?.get(webStyle)?.get(name);
}

/** Everything the server-component emission path remembers for one request. */
export type RscRequestState = {
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
