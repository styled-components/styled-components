// @flow
import stylis from 'stylis'
import type { Interpolation } from '../types'

const stringifyRules = (
  rules: Array<Interpolation>,
  selector: ?string,
  prefix: ?string,
): string => {
  const flatCSS = rules
    .join('')
    .replace(/^\s*\/\/.*$/gm, '') // replace JS comments

  const cssStr = (selector && prefix) ?
    `${prefix} ${selector} { ${flatCSS} }` :
    flatCSS

  const css = stylis(
    prefix || !selector ? '' : selector,
    cssStr,
    false,
    false,
  )

  return css
}

export default stringifyRules
