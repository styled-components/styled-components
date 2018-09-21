// @flow
import isFunction from './isFunction';
import isStyledComponent from './isStyledComponent';
import type { RuleSet } from '../types';

export default function isStaticRules(rules: RuleSet, attrs?: Object): boolean {
  for (let i = 0; i < rules.length; i += 1) {
    const rule = rules[i];

    // recursive case
    if (Array.isArray(rule) && !isStaticRules(rule)) {
      return false;
    } else if (isFunction(rule) && !isStyledComponent(rule)) {
      // functions are allowed to be static if they're just being
      // used to get the classname of a nested styled component
      return false;
    }
  }

  if (attrs !== undefined) {
    // eslint-disable-next-line guard-for-in, no-restricted-syntax
    for (const key in attrs) {
      const value = attrs[key];
      if (isFunction(value)) {
        return false;
      }
    }
  }

  return true;
}
