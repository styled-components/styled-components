// @flow
import type { RuleSet, NameGenerator } from '../types'
import flatten from '../utils/flatten'
import parse from '../vendor/postcss-safe-parser/parse'
import postcssNested from '../vendor/postcss-nested'
import autoprefix from '../utils/autoprefix'
import styleSheet from './StyleSheet'

const inserted = {}

/*
 ComponentStyle is all the CSS-specific stuff, not
 the React-specific stuff.
 */
export default (nameGenerator: NameGenerator) => {
  class ComponentStyle {
    rules: RuleSet
    insertedRule: Object

    constructor(rules: RuleSet) {
      this.rules = rules
      if (!styleSheet.injected) styleSheet.inject()
      this.insertedRule = styleSheet.insert('')
    }

    /*
     * Flattens a rule set into valid CSS
     * Hashes it, wraps the whole chunk in a ._hashName {}
     * Parses that with PostCSS then runs PostCSS-Nested on it
     * Returns the hash to be injected on render()
     * */
    generateAndInjectStyles(executionContext: Object) {
      const flatCSS = flatten(this.rules, executionContext).join('')
        .replace(/^\s*\/\/.*$/gm, '') // replace JS comments
      const selector = nameGenerator(flatCSS)
      if (!inserted[selector]) {
        inserted[selector] = selector
        const root = parse(`.${selector} { ${flatCSS} }`)
        postcssNested(root)
        autoprefix(root)
        this.insertedRule.appendRule(root.toResult().css)
      }
      return inserted[selector]
    }
  }

  return ComponentStyle
}
