// @flow
import type { Interpolation } from '../types'

const stringifyRules = (
  rules: Array<Interpolation>,
  selector: ?string,
  prefix: ?string
): Array<string> => [
  rules.reduce(
    (str: string, partial: Interpolation, index: number): string =>
      str +
      // NOTE: This is to not prefix keyframes with the animation name
      ((index > 0 || !prefix) && selector ? selector : '') +
      (partial && Array.isArray(partial)
        ? partial.join('')
        : partial.toString()),
    ''
  ),
]

export default stringifyRules
