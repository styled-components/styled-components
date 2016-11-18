// @flow

/* Wraps glamor's stylesheet and exports a singleton for the rest
*  of the app to use. */

import { StyleSheet } from '../vendor/glamor/sheet'

class StyleSheetExtended extends StyleSheet {
  reset() {
    return super.flush()
  }
  getCSS() {
    return super.rules().map(rule => rule.cssText).join('\n')
  }
}

export default new StyleSheetExtended({ speedy: false, maxLength: 40 })
