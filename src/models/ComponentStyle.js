// @flow
import hashStr from 'glamor/lib/hash'

import type { RuleSet, NameGenerator } from '../types'
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
    insertedRule: Object

    constructor(rules: RuleSet) {
      this.rules = rules
      if (!styleSheet.injected) styleSheet.inject()
    }

    generateName(str: string) {
      return nameGenerator(hashStr(str))
    }

    /*
     * Flattens a rule set into valid CSS
     * Hashes it, wraps the whole chunk in a ._hashName {}
     * Parses that with PostCSS then runs PostCSS-Nested on it
     * Returns the hash to be injected on render()
     * */
    generateAndInjectStyles(executionContext: Object, identifier: string) {
      // TODO: this is good. Restore it. --------------------------------------v
      if (!this.insertedRule) this.insertedRule = styleSheet.insert(''/* `.${identifier} {}`*/)
      const flatCSS = flatten(this.rules, executionContext).join('')
        .replace(/^\s*\/\/.*$/gm, '') // replace JS comments
      const hash = hashStr(identifier + flatCSS)
      if (!inserted[hash]) {
        const selector = nameGenerator(hash)
        inserted[hash] = selector
        const root = parse(`.${selector} { ${flatCSS} }`)
        postcssNested(root)
        autoprefix(root)
        this.insertedRule.appendRule(/* \n*/`${root.toResult().css}`)
      }
      return inserted[hash]
    }
  }

  return ComponentStyle
}
