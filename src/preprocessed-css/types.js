// @flow
import type {
  Target as _Target,
  NameGenerator as _NameGenerator,
} from '../types'

export type Target = _Target
export type NameGenerator = _NameGenerator

/* eslint-disable no-use-before-define */
export type Interpolation = (
  ((executionContext: Object) => string | FlatPreprocessed) |
  string |
  number
)

export type RuleSet = Array<Interpolation | Preprocessed>
export type FlatRuleSet = Array<Interpolation>

export type FlatPreprocessed = Array<FlatRuleSet>
export type Preprocessed = Array<RuleSet>

