// @flow
import type { RuleSet, Flattener, Stringifier } from '../types'
import styleSheet from './StyleSheet'

export default (flatten: Flattener, stringifyRules: Stringifier) => {
  class GlobalStyle {
    rules: RuleSet;
    selector: ?string;

    constructor(rules: RuleSet, selector: ?string) {
      this.rules = rules
      this.selector = selector
    }

    generateAndInject() {
      if (!styleSheet.injected) styleSheet.inject()
      const flatRules = flatten(this.rules)
      const css = stringifyRules(flatRules, this.selector, true)
      styleSheet.insert(css)
    }
  }

  return GlobalStyle
}
