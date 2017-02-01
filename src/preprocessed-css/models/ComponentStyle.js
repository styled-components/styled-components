// @flow
// This is copied and modified from src/models/ComponentStyle

import hashStr from 'glamor/lib/hash'

import type { FlatPreprocessed, NameGenerator } from '../types'
import flatten from '../utils/flatten'
import prefixPreprocessedSelectors from '../utils/prefixPreprocessedSelectors'
import styleSheet from '../../models/StyleSheet'

export default (nameGenerator: NameGenerator) => {
  const inserted = {}

  class ComponentStyle {
    rules: FlatPreprocessed
    componentId: string
    insertedRule: Object

    constructor(rules: FlatPreprocessed, componentId: string) {
      this.rules = rules
      this.componentId = componentId
      if (!styleSheet.injected) styleSheet.inject()
      this.insertedRule = styleSheet.insert(`.${componentId} {}`)
    }

    static generateName(str: string) {
      return nameGenerator(hashStr(str))
    }

    /*
     * Flattens a rule set into valid CSS
     * Hashes it, wraps the whole chunk in a ._hashName {}
     * Parses that with PostCSS then runs PostCSS-Nested on it
     * Returns the hash to be injected on render()
     * */
    generateAndInjectStyles(executionContext: Object) {
      const hash = hashStr(this.componentId + JSON.stringify(executionContext))

      if (!inserted[hash]) {
        const selector = nameGenerator(hash)
        const classname = `.${selector}`
        const flatCSS = flatten(this.rules, executionContext)
          .map(css => prefixPreprocessedSelectors(classname, css).join(''))
          .join('')

        inserted[hash] = selector
        this.insertedRule.appendRule(flatCSS)
      }

      return inserted[hash]
    }
  }

  return ComponentStyle
}
