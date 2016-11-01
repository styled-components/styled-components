// @flow
import type { Interpolation } from '../types'

// eslint-disable-next-line max-len
export default (strings: Array<string>, interpolations: Array<Interpolation>): Array<Interpolation> => (
  interpolations.reduce((array: Array<Interpolation>, interp: Interpolation, i: number) => (
    array.concat(interp, strings[i + 1])
  ), [strings[0]])
)
