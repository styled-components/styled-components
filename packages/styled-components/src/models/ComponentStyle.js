// @flow
// $FlowFixMe
import hashStr from '../vendor/glamor/hash';
import flatten from '../utils/flatten';
import generateAlphabeticName from '../utils/generateAlphabeticName';
import stringifyRules from '../utils/stringifyRules';
import isStaticRules from '../utils/isStaticRules';
import StyleSheet from './StyleSheet';
import { IS_BROWSER } from '../constants';

import type { Attrs, RuleSet } from '../types';

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

  constructor(rules: RuleSet, attrs: Attrs, componentId: string) {
    this.rules = rules;
    this.isStatic = process.env.NODE_ENV === 'production' && isStaticRules(rules, attrs);
    this.componentId = componentId;

    if (!StyleSheet.master.hasId(componentId)) {
      StyleSheet.master.deferredInject(componentId, []);
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
      typeof lastClassName === 'string' &&
      styleSheet.hasNameForId(componentId, lastClassName)
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
