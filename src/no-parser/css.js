// @flow
import flatten from './flatten'
import type { Interpolation, RuleSet } from '../types'

export default (interpolations: Array<Interpolation>): RuleSet =>
  flatten(interpolations)
