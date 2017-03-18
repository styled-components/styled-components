// @flow
import parse from '../vendor/postcss-safe-parser/parse'
import postcssNested from '../vendor/postcss-nested'

import type { RuleSet } from '../types'
import flatten from '../utils/flatten'

import styleSheet from './AsyncStyleSheet'

let ruleCounter = 0

export default class ComponentStyle {
  rules: RuleSet;
  selector: ?string;

  constructor(rules: RuleSet, selector: ?string) {
    this.rules = rules
    this.selector = selector
  }

  generateAndInject() {
    let flatCSS = flatten(this.rules).join('')
    if (this.selector) {
      flatCSS = `${this.selector} {${flatCSS}\n}`
    }
    const root = parse(flatCSS)
    postcssNested(root)
    styleSheet.addStyle(`global${ruleCounter++}`, root.toResult().css, { global: true })
  }
}
