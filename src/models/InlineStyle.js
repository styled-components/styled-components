// @flow
import hashStr from 'glamor/lib/hash'
import stylis from 'stylis'
import camelCase from 'camel-case'

import type { RuleSet, NameGenerator } from '../types'
import flatten from '../utils/flatten'

/*
 InlineStyle is all the CSS-specific stuff, not
 the React-specific stuff.
 */
export default (nameGenerator: NameGenerator) => {
  const inserted = {}

  class InlineStyle {
    rules: RuleSet
    componentId: string

    constructor(rules: RuleSet, componentId: string) {
      this.rules = rules
      this.componentId = componentId
    }

    static generateName(str: string) {
      return nameGenerator(hashStr(str))
    }

    middlewareFactory(selector: string) {
      const regSel = new RegExp(`^\\.${selector}\\s*?\\{`)
      const regClockEnd = new RegExp('\\}$')
      const pairs = {}

      const fn = (ctx: number, str: string) => {
        if (ctx !== 4) {
          return str
        }

        if (!regSel.test(str)) {
          return str
        }

        const rules = str
          .replace(regSel, '')
          .replace(regClockEnd, '')
          .split(/;/)
          .filter(Boolean)

        rules.forEach((rule) => {
          const [key, value] = rule.split(/:/)
          pairs[camelCase(key)] = value.trim()
        })

        return str
      }

      return {
        pairs,
        fn,
      }
    }

    /*
     * Flattens a rule set into valid CSS
     * Hashes it, wraps the whole chunk in a ._hashName {}
     * Parses that with PostCSS then runs PostCSS-Nested on it
     * Returns the hash to be injected on render()
     * */
    generateStyleObject(executionContext: Object) {
      if (!Array.isArray(this.rules)) {
        return null
      }

      const flatCSS = flatten(this.rules, executionContext)
        .join('')
        .replace(/^\s*\/\/.*$/gm, '') // replace JS comments

      const hash = hashStr(this.componentId + flatCSS)

      if (!inserted[hash]) {
        const selector = nameGenerator(hash)
        const middleware = this.middlewareFactory(selector)

        stylis(`.${selector}`, flatCSS, false, false, middleware.fn)

        inserted[hash] = middleware.pairs
      }

      return inserted[hash]
    }
  }

  return InlineStyle
}
