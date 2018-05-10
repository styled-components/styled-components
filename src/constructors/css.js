// @flow
import interleave from '../utils/interleave'
import flatten from '../utils/flatten'
import type { Interpolation, RuleSet, Styles } from '../types'

export default (
  styles: Styles,
  ...interpolations: Array<Interpolation>
): RuleSet => {
  if (!Array.isArray(styles) && typeof styles === 'object') {
    return flatten(interleave([], [styles, ...interpolations]))
  }
  return flatten(interleave(styles, interpolations))
}
