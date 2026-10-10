import React from 'react';
import type WebStyle from '../models/WebStyle';
import { LIMIT as TOO_MANY_CLASSES_LIMIT } from './createWarnTooManyClasses';
import { fifoSet } from './fifoMap';
import { IS_RSC } from './isRsc';

/** Compiled rules per component and class name, shared by every request: see docs/react.md "RSC style emission and Suspense". */
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

/** What the server-component emission path remembers for one request. */
export type RscRequestState = {
  /** Development only: `<style>` tags emitted per component or global style ID. */
  emitCounts: Map<string, number> | null;
  /** Shared `<style>` elements; see docs/react.md "RSC style emission and Suspense". */
  styleElements: Map<string, React.ReactElement>;
};

/** One request-scoped record behind a single `React.cache` lookup; null outside a server bundle. */
export const getRscRequestState: (() => RscRequestState) | null =
  IS_RSC && React.cache
    ? React.cache(
        (): RscRequestState => ({
          emitCounts: __DEV__ ? new Map() : null,
          styleElements: new Map(),
        })
      )
    : null;

/** Count one more tag emitted for `id` in this request and return the running total. */
export function noteRscEmit(state: RscRequestState, id: string): number {
  const counts = state.emitCounts;
  if (counts === null) return 0;

  const count = (counts.get(id) || 0) + 1;
  counts.set(id, count);

  return count;
}
