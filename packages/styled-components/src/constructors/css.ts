import { Interpolation, RuleSet, Styles } from '../types';
import { EMPTY_ARRAY } from '../utils/empties';
import flatten from '../utils/flatten';
import interleave from '../utils/interleave';
import isFunction from '../utils/isFunction';
import isPlainObject from '../utils/isPlainObject';

export default function css(styles: Styles, ...interpolations: Array<Interpolation>): RuleSet {
  if (isFunction(styles) || isPlainObject(styles)) {
    return flatten(interleave(EMPTY_ARRAY, [styles, ...interpolations]));
  }

  if (interpolations.length === 0 && styles.length === 1 && typeof styles[0] === 'string') {
    return styles;
  }

  // $FlowFixMe
  return flatten(interleave(styles, interpolations));
}
