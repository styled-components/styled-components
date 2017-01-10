// @flow

/* Wraps glamor's stylesheet and exports a singleton for the rest
*  of the app to use. */

import { StyleSheet as GlamorStyle } from '../vendor/glamor/sheet'

class StyleSheet {
  styleSheet: any
  constructor() {
    this.styleSheet = new GlamorStyle({ speedy: false, maxLength: 40 })
  }
  get injected(): any {
    return this.styleSheet.injected
  }
  inject() {
    return this.styleSheet.inject()
  }
  insert(css: string) {
    return this.styleSheet.insert(css)
  }
  reset() {
    if (this.styleSheet.sheet) this.styleSheet.flush()
  }
  getCSS({ min = true }: { min: boolean } = {}) {
    return this.styleSheet.rules().map(rule => rule.cssText).join(min ? '' : '\n')
  }
}

export default new StyleSheet()
