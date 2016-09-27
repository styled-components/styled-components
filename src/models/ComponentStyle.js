// @flow
import hashStr from 'glamor/lib/hash'
import { StyleSheet } from 'glamor/lib/sheet'

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

  constructor(rules: RuleSet) {
    this.rules = rules
  }

  /*
   * Flattens a rule set into valid CSS
   * Hashes it, wraps the whole chunk in a ._hashName {}
   * Parses that with PostCSS then runs PostCSS-Nested on it
   * Returns the hash to be injected on render()
   * */
  generateStyles(executionContext: Object) {
    if (!styleSheet.injected) styleSheet.inject()
    const flatCSS = flatten(this.rules, executionContext).join('')
    const emojis = toEmoji(hashStr(flatCSS))
    if (!generated[emojis]) {
      const root = parse(`.${emojis} { ${flatCSS} }`)
      postcssNested(root)
      generated[emojis] = root.toResult().css
    }
    return emojis
  }

  injectStyles(emojis: string) {
    if (inserted[emojis]) return

    styleSheet.insert(generated[emojis])
    inserted[emojis] = true
  }
}
