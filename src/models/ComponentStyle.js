// @flow
import hashStr from 'glamor/lib/hash'
import { StyleSheet } from 'glamor/lib/sheet'

import type { RuleSet } from '../types'
import flatten from '../utils/flatten'
import parse from '../vendor/postcss/parse'
import postcssNested from '../vendor/postcss-nested'
import toEmoji from '../utils/toEmoji'

const styleSheet = new StyleSheet()
styleSheet.inject()
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
   * Injects that using Glamor's StyleSheet impl.
   * */
  injectStyles(executionContext: Array<any>) {
    if (!styleSheet.injected) styleSheet.inject()
    const flatCSS = flatten(this.rules, executionContext).join('')
    const hash = hashStr(flatCSS)
    const emojis = toEmoji(hash)
    if (!inserted[hash]) {
      const root = parse(`.${emojis} { ${flatCSS} }`)
      postcssNested(root)
      const result = root.toResult().css
      styleSheet.insert(result)
      inserted[hash] = true
    }
    return emojis
  }
}
