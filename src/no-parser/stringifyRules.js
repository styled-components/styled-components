// @flow
import type { Interpolation } from '../types'

const stringifyRules = (
  rules: Array<Interpolation> | string,
  selector: ?string,
  shouldWrap: ?boolean,
): string => {
  const className = (selector && !shouldWrap) ? `.${selector}` : null
  const flatCSS = (
    typeof rules === 'string' ?
      rules :
      rules.reduce((str: string, partial: Interpolation): string => (
        str + (className || '') + partial.toString()
      ), '')
  )

  return (selector && shouldWrap) ? `.${selector} { ${flatCSS} }` : flatCSS
}

export default stringifyRules
