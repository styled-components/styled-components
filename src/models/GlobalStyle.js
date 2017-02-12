// @flow
import stylis from 'stylis'

import type { RuleSet } from '../types'
import flatten from '../utils/flatten'
import styleSheet from './StyleSheet'

export default class ComponentStyle {
  rules: RuleSet;
  selector: ?string;

  constructor(rules: RuleSet, selector: ?string) {
    this.rules = rules
    this.selector = selector
  }

  generateAndInject() {
    if (!styleSheet.injected) styleSheet.inject()
    const flatCSS = flatten(this.rules).join('')
    const cssString = this.selector ? `${this.selector} { ${flatCSS} }` : flatCSS
    const css = stylis('', cssString, false, false)
    styleSheet.insert(css)
  }
}
