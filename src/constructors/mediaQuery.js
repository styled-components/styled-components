// @flow
import css from './css'
import type { Interpolation, RuleSet } from '../types'

// Equivalent to:
// const mediaQuery = (...query) => (...rules) => css`
//   @media ${css(...query)} {
//     ${css(...rules)}
//   }
// `

const mediaQuery = (
  queryStrings: Array<string>,
  ...queryInterpolations: Array<Interpolation>
): Function =>
  (rulesStrings: Array<string>, ...rulesInterpolations: Array<Interpolation>): RuleSet =>
    css`@media ${css(queryStrings, ...queryInterpolations)}{${css(rulesStrings, ...rulesInterpolations)}}`

export default mediaQuery
