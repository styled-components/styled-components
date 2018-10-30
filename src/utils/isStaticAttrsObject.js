// @flow
import isFunction from './isFunction';
import type { Attrs } from '../types';

/**
 * Checks whether the given attributes are static.
 *
 * Factory attribute functions [.attrs(props => ({}))] are considered as non-static by default.
 * Attribute objects are naively inspected, meaning, whenever a function attribute is found,
 * the whole style is treated as dynamic.
 */
export default function isStaticAttrsObject(attrs?: Attrs): boolean {
  if (isFunction(attrs)) {
    return false;
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
