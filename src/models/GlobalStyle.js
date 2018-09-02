// @flow
import type { RuleSet, Stringifier } from '../types'
import flatten from '../utils/flatten'
import isStaticRules from '../utils/isStaticRules'
import StyleSheet from './StyleSheet'

export default (ComponentStyle: Function, stringifyRules: Stringifier) => {
  class GlobalStyle {
    rules: RuleSet
    componentId: string
    isStatic: boolean

    constructor(rules: RuleSet, componentId: string) {
      this.rules = rules
      this.componentId = componentId
      this.isStatic = isStaticRules(rules)

      if (!StyleSheet.master.hasId(componentId)) {
        StyleSheet.master.deferredInject(componentId, [])
      }
    }

    createStyles(executionContext: Object, styleSheet: StyleSheet) {
      const flatCSS = flatten(this.rules, executionContext)
      const css = stringifyRules(flatCSS, '')
      // TODO: We will need to figure out how to do this before 4.0
      // const name = ComponentStyle.generateName(this.componentId + css)
      styleSheet.inject(this.componentId, css, '')
    }

    renderStyles(executionContext: Object, styleSheet: StyleSheet) {
      this.removeStyles(styleSheet)
      this.createStyles(executionContext, styleSheet)
    }

    removeStyles(styleSheet: StyleSheet) {
      const { componentId } = this
      if (styleSheet.hasId(componentId)) {
        styleSheet.remove(componentId)
      }
    }
  }

  return GlobalStyle
}
