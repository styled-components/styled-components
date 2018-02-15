// @flow
import type { RuleSet, Stringifier } from '../types'
import flatten from '../utils/flatten'
import StyleSheet from './StyleSheet'

export default (stringifyRules: Stringifier) => {
  class GlobalStyle {
    rules: RuleSet
    componentId: string

    constructor(rules: RuleSet, attrs?: Object, componentId: string) {
      this.rules = rules
      this.componentId = componentId
    }

    createStyles(executionContext: Object, styleSheet: StyleSheet) {
      const flatCSS = flatten(this.rules, executionContext)
      const css = stringifyRules(flatCSS, '')
      styleSheet.inject(this.componentId, css, '')
    }

    updateStyles(executionContext: Object, styleSheet: StyleSheet) {
      this.removeStyles(styleSheet)
      this.createStyles(executionContext, styleSheet)
    }

    removeStyles(styleSheet: StyleSheet) {
      const { componentId } = this
      styleSheet.remove(componentId)
    }
  }

  return GlobalStyle
}
