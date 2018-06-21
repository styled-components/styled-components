// @flow
import type { ComponentType } from 'react'

export type Interpolation =
  | ((executionContext: Object) => Interpolation)
  | string
  | number
  | Array<Interpolation>

export type RuleSet = Array<Interpolation>

export type Styles =
  | Array<string>
  | Object
  | ((executionContext: Object) => Interpolation)

/* eslint-disable no-undef */
export type Target = string | ComponentType<*>

export type NameGenerator = (hash: number) => string

export type Flattener = (
  chunks: Array<Interpolation>,
  executionContext: ?Object
) => Array<Interpolation>

export type Stringifier = (
  rules: Array<Interpolation>,
  selector: ?string,
  prefix: ?string
) => Array<string>

export type StyleSheet = {
  create: Function,
}
