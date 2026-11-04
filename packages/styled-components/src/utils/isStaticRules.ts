import type { RuleSet } from '../types';
import isFunction from './isFunction';
import isStyledComponent from './isStyledComponent';

/**
 * Whether the rules hold no function that depends on props, including inside
 * nested `css` helpers. A styled component is allowed: it only yields its class name.
 */
export default function isStaticRules<Props extends object>(rules: RuleSet<Props>): boolean {
  for (let i = 0; i < rules.length; i += 1) {
    const rule = rules[i];

    if (Array.isArray(rule)) {
      if (!isStaticRules(rule)) return false;
    } else if (isFunction(rule) && !isStyledComponent(rule)) {
      return false;
    }
  }

  return true;
}
