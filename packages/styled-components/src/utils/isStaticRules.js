// @flow
import isFunction from './isFunction';
import isStyledComponent from './isStyledComponent';
import type { Attrs, RuleSet } from '../types';

function hasFunctionObjectKey(obj: Object): boolean {
  // eslint-disable-next-line guard-for-in, no-restricted-syntax
  for (const key in obj) {
    if (isFunction(obj[key])) {
      return true;
    }
  }

  return false;
}

export default function isStaticRules(rules: RuleSet, attrs: Attrs): boolean {
  for (let i = 0; i < rules.length; i += 1) {
    const rule = rules[i];

    // recursive case
    if (Array.isArray(rule) && !isStaticRules(rule, attrs)) {
      return false;
    } else if (isFunction(rule) && !isStyledComponent(rule)) {
      // functions are allowed to be static if they're just being
      // used to get the classname of a nested styled component
      return false;
    }
  }

  if (attrs.some(x => isFunction(x) || hasFunctionObjectKey(x))) return false;

  return true;
}
