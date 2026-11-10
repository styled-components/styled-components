import React from 'react';
import type WebStyle from '../models/WebStyle';
import { LIMIT as TOO_MANY_CLASSES_LIMIT } from './createWarnTooManyClasses';
import { fifoSet } from './fifoMap';
import { IS_RSC } from './isRsc';

/** Compiled rules per component and class name, shared by every request: see docs/react.md "Server component styles". */
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

/** What the server-component render remembers for one request. */
export type RscRequestState = {
  /** Shared `ScStyle` elements; see docs/react.md "Server component styles". */
  styleElements: Map<string, React.ReactElement>;
};

/** One request-scoped record behind a single `React.cache` lookup; null outside a server bundle. */
export const getRscRequestState: (() => RscRequestState) | null =
  IS_RSC && React.cache ? React.cache((): RscRequestState => ({ styleElements: new Map() })) : null;
