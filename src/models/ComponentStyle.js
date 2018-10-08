// @flow
// $FlowFixMe
import hashStr from '../vendor/glamor/hash';
import flatten from '../utils/flatten';
import generateAlphabeticName from '../utils/generateAlphabeticName';
import stringifyRules from '../utils/stringifyRules';
import isStaticRules from '../utils/isStaticRules';
import StyleSheet from './StyleSheet';
import { IS_BROWSER } from '../constants';

import { type RuleSet } from '../types';

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

  isStatic: boolean;

  lastClassName: ?string;

  constructor(rules: RuleSet, attrs?: Object, componentId: string) {
    this.rules = rules;
    this.isStatic = !isHMREnabled && isStaticRules(rules, attrs);
    this.componentId = componentId;

    if (!StyleSheet.master.hasId(componentId)) {
      const placeholder = process.env.NODE_ENV !== 'production' ? [`.${componentId} {}`] : [];

      StyleSheet.master.deferredInject(componentId, placeholder);
    }
  }

  /*
     * Flattens a rule set into valid CSS
     * Hashes it, wraps the whole chunk in a .hash1234 {}
     * Returns the hash to be injected on render()
     * */
  generateAndInjectStyles(executionContext: Object, styleSheet: StyleSheet) {
    const { isStatic, componentId, lastClassName } = this;
    if (
      IS_BROWSER &&
      isStatic &&
      lastClassName !== undefined &&
      styleSheet.hasNameForId(componentId, ((lastClassName: any): string))
    ) {
      return lastClassName;
    }

    const flatCSS = flatten(this.rules, executionContext, styleSheet);
    const name = hasher(this.componentId + flatCSS.join(''));
    if (!styleSheet.hasNameForId(componentId, name)) {
      styleSheet.inject(
        this.componentId,
        stringifyRules(flatCSS, `.${name}`, undefined, componentId),
        name
      );
    }

    this.lastClassName = name;
    return name;
  }

  static generateName(str: string): string {
    return hasher(str);
  }
}
