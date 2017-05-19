// @flow
/* eslint-disable import/no-unresolved */
import { StyleSheet } from 'react-native'
import transformDeclPairs from 'css-to-react-native'

import hashStr from '../vendor/glamor/hash'
import type { RuleSet } from '../types'
import flatten from '../utils/flatten'
import parse from '../vendor/postcss-safe-parser/parse'

const generated = {}

const excludeShorthands = [
  'borderRadius',
  'borderWidth',
  'borderColor',
  'borderStyle',
]

type StyleSheetImplementation = (styles: Object) => Object
let currentStyleSheetImplementation: StyleSheetImplementation = styles =>
  StyleSheet.create(styles)

export const setStyleSheetPlugin = (styleSheetImplementation: StyleSheetImplementation) => {
  currentStyleSheetImplementation = styleSheetImplementation
}

/*
 InlineStyle takes arbitrary CSS and generates a flat object
 */
export default class InlineStyle {
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
      const mediaObject = {}
      root.each(node => {
        if (node.type === 'decl') {
          declPairs.push([node.prop, node.value])
        } else if (node.type === 'atrule') {
          mediaObject[`@${node.name} ${node.params}`] = transformDeclPairs(node.nodes.map((innerNode) =>
            [innerNode.prop, innerNode.value]), excludeShorthands)
        } else {
          /* eslint-disable no-console */
          console.warn(`Node of type ${node.type} not supported as an inline style`)
        }
      })
      // RN currently does not support differing values for the corner radii of Image
      // components (but does for View). It is almost impossible to tell whether we'll have
      // support, so we'll just disable multiple values here.
      // https://github.com/styled-components/css-to-react-native/issues/11
      const styleObject = transformDeclPairs(declPairs, excludeShorthands)
      const styles = currentStyleSheetImplementation({
        generated: {
          ...styleObject,
          ...mediaObject,
        },
      })
      generated[hash] = styles.generated
    }
    return generated[hash]
  }
}
