// @flow
import hashStr from '../vendor/glamor/hash'

import type { RuleSet, NameGenerator, GlamorInsertedRule } from '../types'
import flatten from '../utils/flatten'
import parse from '../vendor/postcss-safe-parser/parse'
import postcssNested from '../vendor/postcss-nested'
import autoprefix from '../utils/autoprefix'
import styleSheet from './StyleSheet'

/*
 ComponentStyle is all the CSS-specific stuff, not
 the React-specific stuff.
 */
export default (nameGenerator: NameGenerator) => {
  const inserted = {}

  class ComponentStyle {
    rules: RuleSet
    name: ?string
    insertedRule: GlamorInsertedRule

    constructor(rules: RuleSet, name?: string) {
      this.rules = rules
      this.name = name
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
      const notFlatCSS = flatten(this.rules, executionContext).join('')
      const flatCSS = notFlatCSS
        .replace(/~parent\('(.*?)'\)\s*?{([\s\S]+?)}/g, '')
        .replace(/^\s*\/\/.*$/gm, '') // replace JS comments

      const hash = hashStr(flatCSS)
      if (!inserted[hash]) {
        const selector = nameGenerator(hash, this.name)
        inserted[hash] = selector
        const root = parse(`.${selector} { ${flatCSS} }`)
        postcssNested(root)
        autoprefix(root)
        this.insertedRule.appendRule(root.toResult().css)
      }
      return inserted[hash]
    }
  }

  return ComponentStyle
}
