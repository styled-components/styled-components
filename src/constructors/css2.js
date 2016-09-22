// @flow
import interleave from "../utils/interleave";
import flatten from "../utils/flatten";

export type Interpolation = Function | Object | string

export default (strings: Array<string>, ...interpolations: Array<Interpolation>) => (
  flatten(interleave(strings, interpolations))
)
