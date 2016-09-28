// @flow
import hashStr from 'glamor/lib/hash'
import { StyleSheet } from '../vendor/glamor/sheet'

import type { RuleSet } from '../types'
import flatten from '../utils/flatten'
import parse from '../vendor/postcss-safe-parser/parse'
import postcssNested from '../vendor/postcss-nested'
import toEmoji from '../utils/toEmoji'

const styleSheet = new StyleSheet({ speedy: false, maxLength: 40 })
const generated = {}
const inserted = {}

/*
 ComponentStyle is all the CSS-specific stuff, not
 the React-specific stuff.
 */
export default class ComponentStyle {
  rules: RuleSet
  insertedRule: Object

  constructor(rules: RuleSet) {
    this.rules = rules
    if (!styleSheet.injected) styleSheet.inject()
    this.insertedRule = styleSheet.insert('')
  }

  /*
   * Flattens a rule set into valid CSS
   * Hashes it, wraps the whole chunk in a ._hashName {}
   * Parses that with PostCSS then runs PostCSS-Nested on it
   * Returns the hash to be injected on render()
   * */
  generateStyles(executionContext: Object) {
    const flatCSS = flatten(this.rules, executionContext).join('')
    const selector = toEmoji(hashStr(flatCSS))
    if (!generated[selector]) {
      const root = parse(`.${selector} { ${flatCSS} }`)
      postcssNested(root)
      generated[selector] = root.toResult().css
    }
    return selector
  }

  injectStyles(selector: string) {
    if (inserted[selector]) return

    this.insertedRule.appendRule(generated[selector])
    inserted[selector] = true
  }
}
