import { IS_RSC, KEYFRAMES_ID_PREFIX } from '../constants';
import StyleSheet from '../sheet';
import { getGroupForId } from '../sheet/GroupIDAllocator';
import { Keyframes as KeyframesType, Stringifier } from '../types';
import styledError from '../utils/error';
import generateAlphabeticName from '../utils/generateAlphabeticName';
import { KEYFRAMES_SYMBOL } from '../utils/isKeyframes';
import { setToString } from '../utils/setToString';
import { mainStylis } from './StyleSheetManager';

/** RSC optimization: caches compiled keyframe CSS per stylis hash. */
const kfCompiledCache: WeakMap<Keyframes, Map<string, string[]>> | null = IS_RSC
  ? new WeakMap()
  : null;

export default class Keyframes implements KeyframesType {
  readonly [KEYFRAMES_SYMBOL] = true as const;

  id: string;
  name: string;
  rules: string;

  constructor(name: string, rules: string) {
    this.name = name;
    this.id = KEYFRAMES_ID_PREFIX + name;
    this.rules = rules;

    // Eagerly register the group so keyframes defined before components
    // get a lower group ID and appear before them in the stylesheet.
    // Uses getGroupForId directly (not StyleSheet.registerId) because
    // GroupIDAllocator is pure JS — safe for native builds.
    getGroupForId(this.id);

    setToString(this, () => {
      throw styledError(12, String(this.name));
    });
  }

  inject = (styleSheet: StyleSheet, stylisInstance: Stringifier = mainStylis): void => {
    const resolvedName = this.getName(stylisInstance);

    if (!styleSheet.hasNameForId(this.id, resolvedName)) {
      const cacheKey = stylisInstance.hash || '';
      const cached = IS_RSC ? kfCompiledCache?.get(this)?.get(cacheKey) : undefined;
      if (cached) {
        // RSC cache hit: re-insert cached rules into the tag (needed for
        // getGroup in the RSC emission path) without re-running stylis.
        styleSheet.insertRules(this.id, resolvedName, cached);
      } else {
        const compiled = stylisInstance(this.rules, resolvedName, '@keyframes');
        if (IS_RSC && kfCompiledCache) {
          let map = kfCompiledCache.get(this);
          if (!map) {
            map = new Map();
            kfCompiledCache.set(this, map);
          }
          map.set(cacheKey, compiled);
        }
        styleSheet.insertRules(this.id, resolvedName, compiled);
      }
    }
  };

  getName(stylisInstance: Stringifier = mainStylis): string {
    return stylisInstance.hash
      ? this.name + generateAlphabeticName(+stylisInstance.hash >>> 0)
      : this.name;
  }
}
