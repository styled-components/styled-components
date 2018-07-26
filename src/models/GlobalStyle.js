// @flow
import type { RuleSet, Stringifier } from '../types'
import flatten from '../utils/flatten'
import isStaticRules from '../utils/isStaticRules'
import StyleSheet from './StyleSheet'

export default (stringifyRules: Stringifier) => {
  class GlobalStyle {
    rules: RuleSet
    componentId: string
    isStatic: boolean

    constructor(rules: RuleSet, componentId: string) {
      this.rules = rules
      this.componentId = componentId
      this.isStatic = isStaticRules(rules)
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
