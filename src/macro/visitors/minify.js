/* eslint-disable */

import * as t from 'babel-types'

import { useMinify, useCSSPreprocessor } from '../utils/options'
import { isStyled, isHelper } from '../utils/detectors'
import { minifyRawValues, minifyCookedValues } from '../minify'

export default (path, state) => {
  if (
    useMinify(state) &&
    !useCSSPreprocessor(state) &&
    (
      isStyled(path.node.tag, state) ||
      isHelper(path.node.tag, state)
    )
  ) {
    const templateLiteral = path.node.quasi
    const quasisLength = templateLiteral.quasis.length

    const rawValuesMinified = minifyRawValues(templateLiteral.quasis.map(x => x.value.raw))
    const cookedValuesMinfified = minifyCookedValues(templateLiteral.quasis.map(x => x.value.cooked))

    for (let i = 0; i < quasisLength; i++) {
      const element = templateLiteral.quasis[i]

      element.value.raw = rawValuesMinified[i]
      element.value.cooked = cookedValuesMinfified[i]
    }
  }
}
