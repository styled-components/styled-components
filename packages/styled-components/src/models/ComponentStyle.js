// @flow

import flatten from '../utils/flatten';
import hasher from '../utils/hasher';
import stringifyRules from '../utils/stringifyRules';
import isStaticRules from '../utils/isStaticRules';
import StyleSheet from '../sheet';
import { IS_BROWSER } from '../constants';

import type { Attrs, RuleSet } from '../types';

const isHMREnabled =
  process.env.NODE_ENV !== 'production' && typeof module !== 'undefined' && module.hot;

/*
 ComponentStyle is all the CSS-specific stuff, not
 the React-specific stuff.
 */
export default class ComponentStyle {
  rules: RuleSet;

  componentId: string;

  isStatic: boolean;

  prevName: void | string;

  constructor(rules: RuleSet, attrs: Attrs, componentId: string) {
    this.rules = rules;
    this.isStatic = !isHMREnabled && IS_BROWSER && isStaticRules(rules, attrs);
    this.componentId = componentId;

    // NOTE: This registers the componentId, which ensures a consistent order
    // for this component's styles compared to others
    StyleSheet.registerId(componentId);
  }

  /*
     * Flattens a rule set into valid CSS
     * Hashes it, wraps the whole chunk in a .hash1234 {}
     * Returns the hash to be injected on render()
     * */
  generateAndInjectStyles(executionContext: Object, styleSheet: StyleSheet) {
    const { isStatic, componentId, prevName } = this;

    if (
      isStatic &&
      prevName !== undefined &&
      styleSheet.hasNameForId(componentId, prevName)
    ) {
      return prevName;
    }

    const flatRules = flatten(this.rules, executionContext, styleSheet);
    const name = hasher(this.componentId + flatRules.join(''));

    if (!styleSheet.hasNameForId(componentId, name)) {
      const css = stringifyRules(flatRules, `.${name}`, undefined, componentId);
      styleSheet.insertRules(this.componentId, name, css);
    }

    return (this.prevName = name);
  }
}
