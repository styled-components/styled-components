import { StyleSheet } from '../vendor/glamor/sheet'

import type { RuleSet } from '../types'
import flatten from '../utils/flatten'
import parse from '../vendor/postcss-safe-parser/parse'
import postcssNested from '../vendor/postcss-nested'

const styleSheet = new StyleSheet({ speedy: false, maxLength: 40 })

export default class ComponentStyle {
  rules: RuleSet

  constructor(rules: RuleSet) {
    this.rules = rules
  }

  generateAndInject() {
    if (!styleSheet.injected) styleSheet.inject()
    const flatCSS = flatten(this.rules).join('')
    const root = parse(flatCSS)
    postcssNested(root)
    styleSheet.insert(root.toResult().css)
  }
}
