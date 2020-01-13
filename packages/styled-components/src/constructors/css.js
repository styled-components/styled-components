// @flow
import interleave from '../utils/interleave';
import isPlainObject from '../utils/isPlainObject';
import { EMPTY_ARRAY } from '../utils/empties';
import isFunction from '../utils/isFunction';
import flatten from '../utils/flatten';
import type { Interpolation, RuleSet, Styles } from '../types';

export default function css(styles: Styles, ...interpolations: Array<Interpolation>): RuleSet {
  if (isFunction(styles) || isPlainObject(styles)) {
    // $FlowFixMe
    return flatten(interleave(EMPTY_ARRAY, [styles, ...interpolations]));
  }

  if(interpolations.length === 0 && styles.length === 1 && typeof styles[0] === "string") {
    // $FlowFixMe
    return styles;
  }

  // $FlowFixMe
  return flatten(interleave(styles, interpolations));
}
