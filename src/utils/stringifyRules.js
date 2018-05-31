// @flow
import Stylis from 'stylis'
import type { Interpolation } from '../types'

const stylis = new Stylis({
  global: false,
  cascade: true,
  keyframe: false,
  prefix: true,
  compress: false,
  semicolon: true,
})

const stringifyRules = (
  rules: Array<Interpolation>,
  selector: ?string,
  prefix: ?string,
): string => {
  const flatCSS = rules.join('').replace(/^\s*\/\/.*$/gm, '') // replace JS comments

  const cssStr =
    selector && prefix ? `${prefix} ${selector} { ${flatCSS} }` : flatCSS

  return stylis(prefix || !selector ? '' : selector, cssStr)
}

export default stringifyRules
