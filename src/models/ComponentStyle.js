// @flow
import hashStr from 'glamor/lib/hash'
import { StyleSheet } from '../vendor/glamor/sheet'

import type { RuleSet } from '../types'
import flatten from '../utils/flatten'
import parse from '../vendor/postcss-safe-parser/parse'
import postcssNested from '../vendor/postcss-nested'
import autoprefix from '../utils/autoprefix'

const styleSheet = new StyleSheet({ speedy: false, maxLength: 40 })
const inserted = {}

/*
 ComponentStyle is all the CSS-specific stuff, not
 the React-specific stuff.
 */
export default (classNameGenerator: (hash: Number) => string) =>
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
      const hash = hashStr(flatCSS)
      if (!inserted[hash]) {
        const selector = classNameGenerator(hash)
        inserted[hash] = selector
        const root = parse(`.${selector} { ${flatCSS} }`)
        postcssNested(root)
        autoprefix(root)
        this.insertedRule.appendRule(root.toResult().css)
      }
      return inserted[hash]
    }
  }
