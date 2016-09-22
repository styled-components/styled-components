// @flow
export type Interpolation = Function | Object | string

export const interleave = (strings: Array<string>, interpolations: Array<Interpolation>) => (
  interpolations.reduce((array, interp, i) => (
    array.concat(interp, strings[i+1])
  ), [strings[0]])
)

export default (strings: Array<string>, ...interpolations: Array<Interpolation>) => {

}
