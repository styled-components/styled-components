// @flow
import hashStr from 'glamor/lib/hash'
import camelCase from 'camel-case'

import type { RuleSet } from '../types'
import flatten from '../utils/flatten'
import parse from '../vendor/postcss-safe-parser/parse'

const generated = {}

/*
 * InlineStyle takes arbitrary CSS and generates a flat object
 */
export default class InlineStyle {
  rules: RuleSet

  constructor(rules: RuleSet) {
    this.rules = rules
  }

  generateStyleObject(executionContext: Object) {
    if (!Array.isArray(this.rules)) {
      return null
    }

    const flatCSS = flatten(this.rules, executionContext)
      .join('')
      .replace(/^\s*\/\/.*$/gm, '') // replace JS comments

    const hash = hashStr(flatCSS)

    if (!generated[hash]) {
      const root = parse(flatCSS)
      const declPairs = {}

      root.each(node => {
        if (node.type !== 'decl') {
          /* eslint-disable no-console */
          console.warn(`Node of type ${node.type} not supported as an inline style`)
          return
        }

        declPairs[camelCase(node.prop)] = node.value
      })

      generated[hash] = declPairs
    }

    return generated[hash]
  }
}
