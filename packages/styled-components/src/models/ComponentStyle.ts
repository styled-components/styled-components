import { SC_VERSION } from '../constants';
import StyleSheet from '../sheet';
import { getGroupForId } from '../sheet/GroupIDAllocator';
import { ExecutionContext, RuleSet, Stringifier } from '../types';
import flatten from '../utils/flatten';
import generateName from '../utils/generateAlphabeticName';
import { hash, phash } from '../utils/hash';
import isStaticRules from '../utils/isStaticRules';
import { joinStringArray, joinStrings } from '../utils/joinStrings';

declare const __SERVER__: boolean;

const SEED = hash(SC_VERSION);

/**
 * ComponentStyle is all the CSS-specific stuff, not the React-specific stuff.
 */
export default class ComponentStyle {
  baseHash: number;
  baseStyle: ComponentStyle | null | undefined;
  componentId: string;
  isStatic: boolean;
  rules: RuleSet<any>;
  staticRulesId: string;

  constructor(rules: RuleSet<any>, componentId: string, baseStyle?: ComponentStyle | undefined) {
    this.rules = rules;
    this.staticRulesId = '';
    this.isStatic =
      process.env.NODE_ENV === 'production' &&
      (baseStyle === undefined || baseStyle.isStatic) &&
      isStaticRules(rules);
    this.componentId = componentId;
    this.baseHash = phash(SEED, componentId);
    this.baseStyle = baseStyle;

    // NOTE: This registers the componentId, which ensures a consistent order
    // for this component's styles compared to others
    StyleSheet.registerId(componentId);
  }

  generateAndInjectStyles(
    executionContext: ExecutionContext,
    styleSheet: StyleSheet,
    stylis: Stringifier
  ): { className: string; css: string } {
    let names = this.baseStyle
      ? this.baseStyle.generateAndInjectStyles(executionContext, styleSheet, stylis).className
      : '';

    // force dynamic classnames if user-supplied stylis plugins are in use
    if (this.isStatic && !stylis.hash) {
      if (this.staticRulesId && styleSheet.hasNameForId(this.componentId, this.staticRulesId)) {
        names = joinStrings(names, this.staticRulesId);
      } else {
        const cssStatic = joinStringArray(
          flatten(this.rules, executionContext, styleSheet, stylis) as string[]
        );
        const name = generateName(phash(this.baseHash, cssStatic) >>> 0);

        if (!styleSheet.hasNameForId(this.componentId, name)) {
          const cssStaticFormatted = stylis(cssStatic, `.${name}`, undefined, this.componentId);
          styleSheet.insertRules(this.componentId, name, cssStaticFormatted);
        }

        names = joinStrings(names, name);
        this.staticRulesId = name;
      }
    } else {
      let dynamicHash = phash(this.baseHash, stylis.hash);
      let css = '';

      for (let i = 0; i < this.rules.length; i++) {
        const partRule = this.rules[i];

        if (typeof partRule === 'string') {
          css += partRule;

          if (process.env.NODE_ENV !== 'production') dynamicHash = phash(dynamicHash, partRule);
        } else if (partRule) {
          const partString = joinStringArray(
            flatten(partRule, executionContext, styleSheet, stylis) as string[]
          );
          // The same value can switch positions in the array, so we include "i" in the hash.
          dynamicHash = phash(dynamicHash, partString + i);
          css += partString;
        }
      }

      if (css) {
        const name = generateName(dynamicHash >>> 0);

        if (!styleSheet.hasNameForId(this.componentId, name)) {
          const cssFormatted = stylis(css, `.${name}`, undefined, this.componentId);
          styleSheet.insertRules(this.componentId, name, cssFormatted);
        }

        names = joinStrings(names, name);
      }
    }

    // Retrieve CSS from Tag for RSC rendering
    const generatedCSS =
      typeof window === 'undefined'
        ? styleSheet.getTag().getGroup(getGroupForId(this.componentId))
        : '';

    return { className: names, css: generatedCSS };
  }
}
