import { getRegisterVersion, lookupGroup } from '../sheet/GroupIDAllocator';
import { EMPTY_ARRAY } from './empties';
import { fifoSet } from './fifoMap';

/** Most `className` strings whose scan is remembered; the oldest goes first. */
const SCAN_LIMIT = 500;

type Scan = {
  hits: readonly string[];
  /** The register version the scan ran against: a new id since then can turn a miss into a hit. */
  version: number;
};

const scans = new Map<string, Scan>();

/**
 * The tokens of `className` the group register knows, which are the component ids of the styled
 * components that rendered the classes (a wrapper's id reaches the element it wraps through
 * `className`). Remembered per string until the register learns a new id.
 */
export function registeredIdsIn(className: string): readonly string[] {
  const version = getRegisterVersion();
  const known = scans.get(className);
  if (known !== undefined) {
    if (known.version === version) return known.hits;

    scans.delete(className);
  }

  let hits: string[] | null = null;
  let start = 0;

  for (let at = 0; at <= className.length; at++) {
    if (at !== className.length && className.charCodeAt(at) > 32) continue;

    if (at > start) {
      const token = className.slice(start, at);
      if (lookupGroup(token) !== undefined) {
        if (hits === null) hits = [token];
        else hits.push(token);
      }
    }

    start = at + 1;
  }

  const found = hits === null ? EMPTY_ARRAY : hits;
  fifoSet(scans, className, { hits: found, version }, SCAN_LIMIT);

  return found;
}
