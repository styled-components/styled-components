// @flow
import interleave from '../utils/interleave'
import isPlainObject from '../utils/isPlainObject'
import isFunction from '../utils/isFunction'
import { EMPTY_ARRAY } from '../utils/empties'
import flatten from '../utils/flatten'
import type { Interpolation, RuleSet, Styles } from '../types'

export default (
  styles: Styles,
  ...interpolations: Array<Interpolation>
): RuleSet => {
  if (isFunction(styles) || isPlainObject(styles)) {
    // $FlowFixMe
    return flatten(interleave(EMPTY_ARRAY, [styles, ...interpolations]))
  }

  // $FlowFixMe
  return flatten(interleave(styles, interpolations))
}
