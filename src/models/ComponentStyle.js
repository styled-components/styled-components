// @flow
import hashStr from '../vendor/glamor/hash'

import type { RuleSet, NameGenerator, Flattener, Stringifier } from '../types'
import styleSheet from './StyleSheet'

/*
 ComponentStyle is all the CSS-specific stuff, not
 the React-specific stuff.
 */
export default (nameGenerator: NameGenerator, flatten: Flattener, stringifyRules: Stringifier) => {
  const inserted = {}

  class ComponentStyle {
    rules: RuleSet
    componentId: string
    insertedRule: ?Object

    constructor(rules: RuleSet, componentId: string) {
      this.rules = rules
      this.componentId = componentId
      this.insertedRule = undefined

      if (!styleSheet.injected) styleSheet.inject()

      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
        this.insertedRule = styleSheet.insert(`.${componentId} {}`)
      }
    }

    static generateName(str: string) {
      return nameGenerator(hashStr(str))
    }

    insertRule(css: string) {
      if (!this.insertedRule) {
        this.insertedRule = styleSheet.insert(`.${this.componentId} {}${css}`)
      } else {
        this.insertedRule.appendRule(css)
      }
    }

    /*
     * Flattens a rule set into valid CSS
     * Hashes it, wraps the whole chunk in a ._hashName {}
     * Parses that with PostCSS then runs PostCSS-Nested on it
     * Returns the hash to be injected on render()
     * */
    generateAndInjectStyles(executionContext: Object) {
      const flatCSS = flatten(this.rules, executionContext)
      const hash = hashStr(this.componentId + flatCSS.join(''))

      if (inserted[hash] === undefined) {
        const selector = nameGenerator(hash)
        inserted[hash] = selector

        const css = stringifyRules(flatCSS, `.${selector}`)
        this.insertRule(css)
      }

      return inserted[hash]
    }
  }

  return ComponentStyle
}
