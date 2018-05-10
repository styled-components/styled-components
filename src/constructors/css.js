// @flow
import interleave from '../utils/interleave'
import flatten from '../utils/flatten'
import type { Interpolation, RuleSet } from '../types'

export default (
  strings: Array<string> | Object,
  ...interpolations: Array<Interpolation>
): RuleSet => {
  if (!Array.isArray(strings) && typeof strings === 'object') {
    return flatten(interleave([], [strings, ...interpolations]))
  }
  return flatten(interleave(strings, interpolations))
}
