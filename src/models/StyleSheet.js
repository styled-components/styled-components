// @flow

/* Wraps glamor's stylesheet and exports a singleton for the rest
*  of the app to use. */

import { StyleSheet as GlamorStyle } from '../vendor/glamor/sheet'

class StyleSheet {
  constructor() {
    this.styleSheet = new GlamorStyle({ speedy: false, maxLength: 40 })
  }
  get injected() {
    return this.styleSheet.injected
  }
  inject() {
    return this.styleSheet.inject()
  }
  insert(css) {
    return this.styleSheet.insert(css)
  }
  reset() {
    if (this.styleSheet.sheet) this.styleSheet.flush()
  }
  getCSS({ min = true } = {}) {
    return this.styleSheet.rules().map(rule => rule.cssText).join(min ? '' : '\n')
  }
}

export default new StyleSheet()
