// @flow
import hashStr from '../vendor/glamor/hash'

import type { RuleSet, NameGenerator, Flattener, Stringifier } from '../types'
import { StyleSheet } from './BrowserStyleSheet'

/*
 ComponentStyle is all the CSS-specific stuff, not
 the React-specific stuff.
 */
let counter = 0
export default (nameGenerator: NameGenerator, flatten: Flattener, stringifyRules: Stringifier) => {
  class ComponentStyle {
    rules: RuleSet
    componentId: string
    order: number

    constructor(rules: RuleSet, componentId: string) {
      this.rules = rules
      this.componentId = componentId
      // eslint-disable-next-line no-plusplus
      this.order = counter++
    }

    /*
     * Flattens a rule set into valid CSS
     * Hashes it, wraps the whole chunk in a .hash1234 {}
     * Returns the hash to be injected on render()
     * */
    generateAndInjectStyles(executionContext: Object, styleSheet: StyleSheet) {
      /* TODO: find a way for order to be taken in to account */
      if (!styleSheet.hasInjectedComponent(this.componentId)) {
        styleSheet.inject(this.componentId, true, `.${this.componentId} {}`)
      }

      const flatCSS = flatten(this.rules, executionContext)
      const hash = hashStr(this.componentId + flatCSS.join(''))

      const existingName = styleSheet.getName(hash)
      if (existingName) return existingName

      const name = nameGenerator(hash)
      if (styleSheet.alreadyInjected(hash, name)) return name

      const css = stringifyRules(flatCSS, `.${name}`)
      styleSheet.inject(this.componentId, true, css, hash, name)
      return name
    }

    static generateName(str: string) {
      return nameGenerator(hashStr(str))
    }
  }

  return ComponentStyle
}
