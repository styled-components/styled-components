// @flow

import { GroupRegistry, Sheet } from 'styled-sheet';

// $FlowFixMe
import hashStr from '../vendor/glamor/hash';
import flatten from '../utils/flatten';
import generateAlphabeticName from '../utils/generateAlphabeticName';
import stringifyRules from '../utils/stringifyRules';
import isStaticRules from '../utils/isStaticRules';
import { IS_BROWSER } from '../constants';

import type { Attrs, RuleSet } from '../types';

const isHMREnabled =
  process.env.NODE_ENV !== 'production' && typeof module !== 'undefined' && module.hot;

/* combines hashStr (murmurhash) and nameGenerator for convenience */
const hasher = (str: string): string => generateAlphabeticName(hashStr(str));

/*
 ComponentStyle is all the CSS-specific stuff, not
 the React-specific stuff.
 */
export default class ComponentStyle {
  rules: RuleSet;

  componentId: string;

  group: number;

  lastKey: void | string;

  isStatic: boolean;

  constructor(rules: RuleSet, attrs: Attrs, componentId: string) {
    this.rules = rules;
    this.isStatic = IS_BROWSER && !isHMREnabled && isStaticRules(rules, attrs);
    this.componentId = componentId;
    this.group = GroupRegistry.registerRuleGroup(componentId);
  }

  /*
     * Flattens a rule set into valid CSS
     * Hashes it, wraps the whole chunk in a .hash1234 {}
     * Returns the hash to be injected on render()
     * */
  generateAndInjectStyles(executionContext: Object, sheet: Sheet) {
    const { isStatic, group, componentId, lastKey } = this;

    if (
      isStatic &&
      lastKey !== undefined &&
      sheet.hasKey(group, lastKey)
    ) {
      return lastKey;
    }

    const flatCSS = flatten(this.rules, executionContext, sheet);
    const key = hasher(this.componentId + flatCSS.join(''));
    const rules = stringifyRules(flatCSS, `.${key}`, undefined, componentId);

    sheet.inject(group, key, rules);
    this.lastKey = key;
    return key;
  }

  static generateName(str: string): string {
    return hasher(str);
  }
}
