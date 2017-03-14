// @flow
import stylis from 'stylis'
import type { Interpolation } from '../types'

const stringifyRules = (
  rules: Array<Interpolation> | string,
  selector: ?string,
  shouldWrap: ?boolean,
): string => {
  const flatCSS = (
    typeof rules === 'string' ?
      rules :
      rules.join('')
        .replace(/^\s*\/\/.*$/gm, '') // replace JS comments
  )

  const cssString = (selector && shouldWrap) ? `${selector} { ${flatCSS} }` : flatCSS

  const css = stylis(
    (selector && !shouldWrap) ? `.${selector}` : '',
    cssString,
    false,
    false,
  )

  return css
}

export default stringifyRules
