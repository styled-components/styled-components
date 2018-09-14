// @flow
import { IS_BROWSER } from '../constants'
import { EMPTY_OBJECT } from '../utils/empties'
import flatten from '../utils/flatten'
import isStaticRules from '../utils/isStaticRules'
import stringifyRules from '../utils/stringifyRules'
import StyleSheet from './StyleSheet'

import type { RuleSet } from '../types'

export default class GlobalStyle {
  componentId: string
  isStatic: boolean
  lastExecutionContext: Object
  rules: RuleSet

  constructor(rules: RuleSet, componentId: string) {
    this.lastExecutionContext = EMPTY_OBJECT
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

    styleSheet.inject(this.componentId, css)
  }

  removeStyles(styleSheet: StyleSheet) {
    const { componentId } = this
    if (styleSheet.hasId(componentId)) {
      styleSheet.remove(componentId)
    }
  }

  /**
   * Rendering for global styles is removing + adding, so it's a
   * little expensive on the DOM. We don't want to do it unless
   * something actually changed.
   */
  shouldRenderStyles(executionContext: Object) {
    return (
      !IS_BROWSER ||
      !this.lastExecutionContext ||
      Object.keys(executionContext).some(
        key => this.lastExecutionContext[key] !== executionContext[key]
      )
    )
  }

  renderStyles(executionContext: Object, styleSheet: StyleSheet) {
    if (this.shouldRenderStyles(executionContext)) {
      this.removeStyles(styleSheet)
      this.createStyles(executionContext, styleSheet)

      this.lastExecutionContext = executionContext
    }
  }
}
