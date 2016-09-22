// @flow
import type { Interpolation } from '../types'

export default (strings: Array<string>, interpolations: Array<Interpolation>) : Array<Interpolation> => (
  interpolations.reduce((array, interp, i) => (
    array.concat(interp, strings[i + 1])
  ), [strings[0]])
)
