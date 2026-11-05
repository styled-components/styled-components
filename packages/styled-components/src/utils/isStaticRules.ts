import isFunction from './isFunction';
import isPlainObject from './isPlainObject';
import isStyledComponent from './isStyledComponent';

/**
 * Whether the rules hold no function that depends on props, including inside
 * nested `css` helpers and style objects. A styled component is allowed: it only
 * yields its class name.
 */
export default function isStaticRules(rules: ReadonlyArray<unknown>): boolean {
  for (let i = 0; i < rules.length; i += 1) {
    const rule = rules[i];

    if (Array.isArray(rule) || isPlainObject(rule)) {
      if (!isStaticRules(Object.values(rule))) return false;
    } else if (isFunction(rule) && !isStyledComponent(rule)) {
      return false;
    }
  }

  return true;
}
