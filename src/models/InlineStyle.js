// @flow
/* eslint-disable import/no-unresolved */
import transformDeclPairs from 'css-to-react-native'

import hashStr from '../vendor/glamor/hash'
import type { RuleSet, StyleSheet } from '../types'
import flatten from '../utils/flatten'
import parse from '../vendor/postcss-safe-parser/parse'

let generated = {}

export const resetStyleCache = () => {
  generated = {}
}

/*
 InlineStyle takes arbitrary CSS and generates a flat object
 */
export default (styleSheet: StyleSheet) => {
  class InlineStyle {
    rules: RuleSet

    constructor(rules: RuleSet) {
      this.rules = rules
    }

    generateStyleObject(executionContext: Object) {
      const flatCSS = flatten(this.rules, executionContext).join('')
      const hash = hashStr(flatCSS)
      if (!generated[hash]) {
        const root = parse(flatCSS)
        const declPairs = []
        root.each(node => {
          if (node.type === 'decl') {
            declPairs.push([node.prop, node.value])
          } else if (node.type !== 'comment') {
            /* eslint-disable no-console */
            console.warn(`Node of type ${node.type} not supported as an inline style`)
          }
        })
        // RN currently does not support differing values for the corner radii of Image
        // components (but does for View). It is almost impossible to tell whether we'll have
        // support, so we'll just disable multiple values here.
        // https://github.com/styled-components/css-to-react-native/issues/11
        const styleObject = transformDeclPairs(declPairs, [
          'borderRadius',
          'borderWidth',
          'borderColor',
          'borderStyle',
        ])
        const styles = styleSheet.create({
          generated: styleObject,
        })
        generated[hash] = styles.generated
      }
      return generated[hash]
    }
  }

  return InlineStyle
}
