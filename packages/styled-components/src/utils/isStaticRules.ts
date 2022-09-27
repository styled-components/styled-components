import { RuleSet } from '../types';
import isFunction from './isFunction';
import isStyledComponent from './isStyledComponent';

export default function isStaticRules<Props extends object>(rules: RuleSet<Props>) {
  for (let i = 0; i < rules.length; i += 1) {
    const rule = rules[i];

    if (isFunction(rule) && !isStyledComponent(rule)) {
      // functions are allowed to be static if they're just being
      // used to get the classname of a nested styled component
      return false;
    }
  }

  return true;
}
