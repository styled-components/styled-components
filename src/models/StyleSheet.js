// @flow

/* Wraps glamor's stylesheet and exports a singleton for the rest
*  of the app to use. */

import { StyleSheet as GlamorStyle } from '../vendor/glamor/sheet'

class StyleSheet {
  styleSheet: GlamorStyle
  constructor() {
    this.styleSheet = new GlamorStyle({ speedy: false, maxLength: 40 })
  }
  get injected(): boolean {
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
  rules() {
    return this.styleSheet.rules()
  }
  getCSS({ min = true }: { min: boolean } = {}) {
    return this.styleSheet.sheet ?
      this.styleSheet.rules().map(rule => rule.cssText).join(min ? '' : '\n')
      : ''
  }
}

export default new StyleSheet()
