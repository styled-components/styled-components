// @flow
import type { RuleSet, Flattener, Stringifier } from '../types'
import styleSheet from './StyleSheet'

export default (flatten: Flattener, stringifyRules: Stringifier) => {
  class GlobalStyle {
    rules: RuleSet
    selector: ?string
    prefix: ?string

    constructor(rules: RuleSet, selector: ?string, prefix: ?string) {
      this.rules = rules
      this.selector = selector
      this.prefix = prefix
    }

    generateAndInject() {
      if (!styleSheet.injected) styleSheet.inject()
      const flatRules = flatten(this.rules)
      const css = stringifyRules(flatRules, this.selector, this.prefix)

      styleSheet.insert(css)
    }
  }

  return GlobalStyle
}
