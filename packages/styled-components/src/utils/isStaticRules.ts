import { RuleSet } from '../types';
import isFunction from './isFunction';

/** A function left in the rules is an interpolation: `css()` has already turned styled components into selectors. */
export default function isStaticRules<Props extends object>(rules: RuleSet<Props>) {
  for (let i = 0; i < rules.length; i += 1) {
    if (isFunction(rules[i])) return false;
  }

  return true;
}
