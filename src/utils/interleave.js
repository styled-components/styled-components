// @flow
import type { Interpolation, RuleSet } from '../types'

export default (strings: Array<string>, interpolations: Array<Interpolation>): RuleSet => (
  interpolations.reduce((array, interp, i) => (
    array.concat(interp, strings[i + 1])
  ), [strings[0]])
)
