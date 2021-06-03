// @flow
import { SC_VERSION } from '../constants';
import StyleSheet from '../sheet';
import type { RuleSet, Stringifier } from '../types';
import flatten from '../utils/flatten';
import generateName from '../utils/generateAlphabeticName';
import { hash, phash } from '../utils/hash';
import isStaticRules from '../utils/isStaticRules';

const SEED = hash(SC_VERSION);

/**
 * ComponentStyle is all the CSS-specific stuff, not the React-specific stuff.
 */
export default class ComponentStyle {
  baseHash: number;

  baseStyle: ?ComponentStyle;

  componentId: string;

  isStatic: boolean;

  rules: RuleSet;

  staticRulesId: string;

  constructor(rules: RuleSet, componentId: string, baseStyle?: ComponentStyle) {
    this.rules = rules;
    this.staticRulesId = '';
    this.isStatic = process.env.NODE_ENV === 'production' &&
      (baseStyle === undefined || baseStyle.isStatic) &&
      isStaticRules(rules);
    this.componentId = componentId;

    // SC_VERSION gives us isolation between multiple runtimes on the page at once
    // this is improved further with use of the babel plugin "namespace" feature
    this.baseHash = phash(SEED, componentId);

    this.baseStyle = baseStyle;

    // NOTE: This registers the componentId, which ensures a consistent order
    // for this component's styles compared to others
    StyleSheet.registerId(componentId);
  }

  /*
   * Flattens a rule set into valid CSS
   * Hashes it, wraps the whole chunk in a .hash1234 {}
   * Returns the hash to be injected on render()
   * */
  generateAndInjectStyles(executionContext: Object, styleSheet: StyleSheet, stylis: Stringifier) {
    const { componentId } = this;

    const names = [];

    if (this.baseStyle) {
      names.push(this.baseStyle.generateAndInjectStyles(executionContext, styleSheet, stylis));
    }

    // force dynamic classnames if user-supplied stylis plugins are in use
    if (this.isStatic && !stylis.hash) {
      if (this.staticRulesId && styleSheet.hasNameForId(componentId, this.staticRulesId)) {
        names.push(this.staticRulesId);
      } else {
        const cssStatic = flatten(this.rules, executionContext, styleSheet, stylis).join('');
        const name = generateName(phash(this.baseHash, cssStatic) >>> 0);

        if (!styleSheet.hasNameForId(componentId, name)) {
          const cssStaticFormatted = stylis(cssStatic, `.${name}`, undefined, componentId);

          styleSheet.insertRules(componentId, name, cssStaticFormatted);
        }

        names.push(name);
        this.staticRulesId = name;
      }
    } else {
      const { length } = this.rules;
      let dynamicHash = phash(this.baseHash, stylis.hash);
      let css = '';

      for (let i = 0; i < length; i++) {
        const partRule = this.rules[i];

        if (typeof partRule === 'string') {
          css += partRule;

          if (process.env.NODE_ENV !== 'production') dynamicHash = phash(dynamicHash, partRule + i);
        } else if (partRule) {
          const partChunk = flatten(partRule, executionContext, styleSheet, stylis);
          const partString = Array.isArray(partChunk) ? partChunk.join('') : partChunk;
          dynamicHash = phash(dynamicHash, partString + i);
          css += partString;
        }
      }

      if (css) {
        const name = generateName(dynamicHash >>> 0);

        if (!styleSheet.hasNameForId(componentId, name)) {
          const cssFormatted = stylis(css, `.${name}`, undefined, componentId);
          styleSheet.insertRules(componentId, name, cssFormatted);
        }

        names.push(name);
      }
    }

    return names.join(' ');
  }
}
