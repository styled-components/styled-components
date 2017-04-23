// @flow
import hashStr from '../vendor/glamor/hash'

import type { RuleSet, NameGenerator, Flattener, Stringifier } from '../types'
import StyleSheet from './StyleSheet'

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
      if (!StyleSheet.instance.hasInjectedComponent(this.componentId)) {
        const placeholder = process.env.NODE_ENV !== 'production' ? `.${componentId} {}` : ''
        StyleSheet.instance.deferredInject(componentId, true, placeholder)
      }
    }

    /*
     * Flattens a rule set into valid CSS
     * Hashes it, wraps the whole chunk in a .hash1234 {}
     * Returns the hash to be injected on render()
     * */
    generateAndInjectStyles(executionContext: Object, styleSheet: StyleSheet) {
      const flatCSS = flatten(this.rules, executionContext)
      const hash = hashStr(this.componentId + flatCSS.join(''))

      const existingName = styleSheet.getName(hash)
      if (existingName) return existingName

      const name = nameGenerator(hash)
      if (styleSheet.alreadyInjected(hash, name)) return name

      const css = `\n${stringifyRules(flatCSS, `.${name}`)}`
      styleSheet.inject(this.componentId, true, css, hash, name)
      return name
    }

    static generateName(str: string) {
      return nameGenerator(hashStr(str))
    }
  }

  return ComponentStyle
}
