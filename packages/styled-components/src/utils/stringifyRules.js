// @flow
import isFunction from './isFunction';

export default function stringifyRules(rules: Array<any>): string {
  const newRules = rules.map(rule => {
    if (isFunction(rule)) {
      return rule.toString();
    }
    return rule;
  });
  return JSON.stringify(newRules);
}
