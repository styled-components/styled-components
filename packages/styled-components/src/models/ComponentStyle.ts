import { SC_VERSION } from '../constants';
import StyleSheet from '../sheet';
import type { AnyComponent } from '../types';
import { ExecutionContext, RuleSet, Stringifier } from '../types';
import flatten from '../utils/flatten';
import generateName from '../utils/generateAlphabeticName';
import getComponentName from '../utils/getComponentName';
import { hash, phash, phashN } from '../utils/hash';
import isKeyframes from '../utils/isKeyframes';
import isPlainObject from '../utils/isPlainObject';
import isStatelessFunction from '../utils/isStatelessFunction';
import isStaticRules from '../utils/isStaticRules';
import { joinStringArray, joinStrings } from '../utils/joinStrings';

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
  ): string {
    let names = this.baseStyle
      ? this.baseStyle.generateAndInjectStyles(executionContext, styleSheet, stylis)
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
          const cssStaticFormatted = stylis(cssStatic, '.' + name, undefined, this.componentId);
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
          // Fast path: single interpolation function returning a string (the common case
          // in template literals). Avoids flatten's type dispatching, array allocation,
          // and joinStringArray overhead. Falls through to flatten for non-string returns
          // (keyframes, styled components, objects, arrays).
          let partString: string;
          if (isStatelessFunction(partRule)) {
            const fnResult = partRule(executionContext);
            if (typeof fnResult === 'string') {
              partString = fnResult;
            } else if (fnResult === undefined || fnResult === null || fnResult === false) {
              partString = '';
            } else {
              if (
                process.env.NODE_ENV !== 'production' &&
                typeof fnResult === 'object' &&
                !Array.isArray(fnResult) &&
                !isKeyframes(fnResult) &&
                !isPlainObject(fnResult)
              ) {
                console.error(
                  `${getComponentName(
                    partRule as AnyComponent
                  )} is not a styled component and cannot be referred to via component selector. See https://www.styled-components.com/docs/advanced#referring-to-other-components for more details.`
                );
              }

              partString = joinStringArray(
                flatten(fnResult, executionContext, styleSheet, stylis) as string[]
              );
            }
          } else {
            partString = joinStringArray(
              flatten(partRule, executionContext, styleSheet, stylis) as string[]
            );
          }
          // The same value can switch positions in the array, so we include "i" in the hash.
          // Split into two calls to avoid temp string allocation (partString + i).
          // phash processes right-to-left, so phash(h, a+b) === phash(phash(h, b), a).
          dynamicHash = phash(phashN(dynamicHash, i), partString);
          css += partString;
        }
      }

      if (css) {
        const name = generateName(dynamicHash >>> 0);

        if (!styleSheet.hasNameForId(this.componentId, name)) {
          const cssFormatted = stylis(css, '.' + name, undefined, this.componentId);
          styleSheet.insertRules(this.componentId, name, cssFormatted);
        }

        names = joinStrings(names, name);
      }
    }

    return names;
  }
}
