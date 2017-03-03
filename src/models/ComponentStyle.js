// @flow
import hashStr from 'glamor/lib/hash'

import type { RuleSet, NameGenerator, GlamorInsertedRule } from '../types'
import flatten from '../utils/flatten'
import parse from '../vendor/postcss-safe-parser/parse'
import postcssNested from '../vendor/postcss-nested'
import autoprefix from '../utils/autoprefix'
import styleSheet from './AsyncStyleSheet'

/*
 ComponentStyle is all the CSS-specific stuff, not
 the React-specific stuff.
 */
const CLEARING_TIMEOUT = 1000

const invisibleStyle = '__styled__invisible'

styleSheet.addStyle(invisibleStyle, `.${invisibleStyle} {visibility:hidden}`)
styleSheet.forceFlush()

const hashSelector = {}

export default (nameGenerator: NameGenerator) => {
  class ComponentStyle {
    rules: RuleSet

    static invisible = invisibleStyle;

    constructor(rules: RuleSet) {
      this.rules = rules
    }

    /*
     * Flattens a rule set into valid CSS
     * Hashes it, wraps the whole chunk in a ._hashName {}
     * Parses that with PostCSS then runs PostCSS-Nested on it
     * Returns the hash to be injected on render()
     * */
    addStyle(executionContext: Object) {
      const inserted = styleSheet.inserted
      const flatCSS = flatten(this.rules, executionContext).join('')
        .replace(/^\s*\/\/.*$/gm, '') // replace JS comments
      const hash = hashStr(flatCSS)
      const selector = hashSelector[hash] || nameGenerator(hash)
      hashSelector[hash] = selector

      if (!inserted[selector]) {
        const root = parse(`.${selector} { ${flatCSS} }`)
        postcssNested(root)
        autoprefix(root)
        inserted[selector] = {
          rule: styleSheet.addStyle(selector, root.toResult().css),
          useCount: 1,
        }
      } else {
        inserted[selector].useCount++
        if (inserted[selector].timeOut) {
          clearTimeout(inserted[selector].timeOut)
        }
      }
      return inserted[selector].rule.promise.then(() => selector)
    }

    removeStyle(selector) {
      const inserted = styleSheet.inserted
      if (!selector || !inserted[selector]) {
        return
      }
      inserted[selector].useCount--
      if (!inserted[selector].useCount) {
        if (inserted[selector].timeOut) {
          clearTimeout(inserted[selector].timeOut)
        }
        inserted[selector].timeOut = setTimeout(() => {
          inserted[selector].rule.remove()
          delete inserted[selector]
        }, CLEARING_TIMEOUT)
      }
    }
  }

  return ComponentStyle
}
