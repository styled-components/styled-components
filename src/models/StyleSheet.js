// @flow

/* Wraps glamor's stylesheet and exports a singleton for the rest
*  of the app to use. */

import { StyleSheet as GlamorStyle } from '../vendor/glamor/sheet'

class StyleSheet {
  styleSheet: GlamorStyle
  cache: Array<{cssText: string}>
  constructor() {
    this.styleSheet = new GlamorStyle({ speedy: false, maxLength: 40 })
    this.cache = []
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
    if (this.styleSheet.sheet) {
      this.cache = this.styleSheet.rules()
      this.styleSheet.flush()
    }
  }
  getCSS({ min = true }: { min: boolean } = {}) {
    let css = this.styleSheet.rules()

    if ((css.length <= 0) && (this.cache.length > 0)) {
      css = this.cache
    }

    return css.map(rule => rule.cssText).join(min ? '' : '\n')
  }
}

export default new StyleSheet()
