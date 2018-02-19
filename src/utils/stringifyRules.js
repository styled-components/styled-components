// @flow
import Stylis from 'stylis'
import _insertRulePlugin from 'stylis-rule-sheet'
import type { Interpolation } from '../types'

// NOTE: This stylis instance is only used to split rules from SSR'd style tags
const stylisSplitter = new Stylis({
  global: false,
  cascade: false,
  keyframe: false,
  prefix: false,
  compress: false,
  semicolon: true,
})

const stylis = new Stylis({
  global: false,
  cascade: true,
  keyframe: false,
  prefix: true,
  compress: false,
  semicolon: false, // NOTE: This means "autocomplete missing semicolons"
})

// Wrap `insertRulePlugin to build a list of rules,
// and then make our own plugin to return the rules. This
// makes it easier to hook into the existing SSR architecture

let parsingRules = []
// eslint-disable-next-line consistent-return
const returnRulesPlugin = context => {
  if (context === -2) {
    const parsedRules = parsingRules
    parsingRules = []
    return parsedRules
  }
}

const parseRulesPlugin = _insertRulePlugin(rule => {
  parsingRules.push(rule)
})

stylis.use([parseRulesPlugin, returnRulesPlugin])
stylisSplitter.use([parseRulesPlugin, returnRulesPlugin])

const stringifyRules = (
  rules: Array<Interpolation>,
  selector: ?string,
  prefix: ?string
): Array<string> => {
  const flatCSS = rules.join('').replace(/^\s*\/\/.*$/gm, '') // replace JS comments

  const cssStr =
    selector && prefix ? `${prefix} ${selector} { ${flatCSS} }` : flatCSS

  return stylis(prefix || !selector ? '' : selector, cssStr)
}

export const splitByRules = (css: string): Array<string> =>
  stylisSplitter('', css)

export default stringifyRules
