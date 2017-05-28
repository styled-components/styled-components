// @flow
import interleave from '../utils/interleave'
import flatten from '../utils/flatten'
import type { Interpolation, RuleSet } from '../types'

export default (strings: Array<string>, ...interpolations: Array<Interpolation>): RuleSet => (
  flatten(interleave(strings, interpolations))
)
