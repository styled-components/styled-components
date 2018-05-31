// @flow
export type Interpolation =
  | ((executionContext: Object) => Interpolation)
  | string
  | number
  | Array<Interpolation>

/* todo: I want this to actually be an array of Function | string but that causes errors */
export type RuleSet = Array<Interpolation>

/* eslint-disable no-undef */
export type Target = string | ReactClass<*>

export type NameGenerator = (hash: number) => string

export type Flattener = (
  chunks: Array<Interpolation>,
  executionContext: ?Object,
) => Array<Interpolation>

export type Stringifier = (
  rules: Array<Interpolation>,
  selector: ?string,
  prefix: ?string,
) => string

export type StyleSheet = {
  create: Function,
}
