// @flow
import { EMPTY_ARRAY, flatten, interleave, isFunction, isPlainObject } from '../utils';
import type { Interpolation, RuleSet, Styles } from '../types';

export function css(styles: Styles, ...interpolations: Array<Interpolation>): RuleSet {
  if (isFunction(styles) || isPlainObject(styles)) {
    // $FlowFixMe
    return flatten(interleave(EMPTY_ARRAY, [styles, ...interpolations]));
  }

  // $FlowFixMe
  return flatten(interleave(styles, interpolations));
}
