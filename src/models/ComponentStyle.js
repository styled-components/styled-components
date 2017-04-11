// @flow
import hashStr from '../vendor/glamor/hash'

import type { RuleSet, NameGenerator, Flattener, Stringifier } from '../types'
import StyleSheet from './BrowserStyleSheet'

/*
 ComponentStyle is all the CSS-specific stuff, not
 the React-specific stuff.
 */
export default (nameGenerator: NameGenerator, flatten: Flattener, stringifyRules: Stringifier) => {
  class ComponentStyle {
    rules: RuleSet
    componentId: string

    constructor(rules: RuleSet, componentId: string) {
      this.rules = rules
      this.componentId = componentId

      /* Todo: potentially restore this guard. */
      // if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      if (!StyleSheet.instance.hasInjectedComponent(componentId)) { StyleSheet.instance.inject(componentId, true, `.${componentId} {}`) }
    }

    /*
     * Flattens a rule set into valid CSS
     * Hashes it, wraps the whole chunk in a .hash1234 {}
     * Returns the hash to be injected on render()
     * */
    generateAndInjectStyles(executionContext: Object) {
      const flatCSS = flatten(this.rules, executionContext)
      const hash = hashStr(this.componentId + flatCSS.join(''))

      const existingName = StyleSheet.instance.getName(hash)
      if (existingName) return existingName

      const name = nameGenerator(hash)
      if (StyleSheet.instance.alreadyInjected(hash, name)) return name

      const css = stringifyRules(flatCSS, `.${name}`)
      StyleSheet.instance.inject(this.componentId, true, css, hash, name)
      return name
    }

    static generateName(str: string) {
      return nameGenerator(hashStr(str))
    }
  }

  return ComponentStyle
}
