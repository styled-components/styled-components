/* eslint-disable */

import * as t from 'babel-types'
import Stylis from 'stylis'

import {
  makePlaceholder,
  temporaryClassname,
  isUnendedMixin,
  containsPlaceholders,
  splitByPlaceholders,
  fixGlobalPlaceholders,
} from './placeholderUtils'

const stylis = new Stylis({
  global: false,
  cascade: true,
  keyframe: false,
  prefix: true,
  compress: false,
  semicolon: true,
})

// Assembles CSS partials and replaces interpolations with placeholders
export const assembleAndInterleavePlaceholders = cssArr => {
  let css = cssArr[0]

  for (let i = 1; i < cssArr.length; i++) {
    const interpolationIndex = i - 1
    const placeholder = makePlaceholder(interpolationIndex)
    const cssPartial = cssArr[i]

    // Append a semicolon to all mixins (not selectors, not rule)
    const separator = isUnendedMixin(cssPartial) ? ';' : ''

    css += placeholder + separator + cssPartial
  }

  return css
}

// Splits the css into an array with interleaved interpolation nodes
export const cssWithPlaceholdersToArr = (css, interpolationNodes) => {
  const placeholderSplit = splitByPlaceholders(css)
  const res = []

  for (let i = 0; i < placeholderSplit.length; i++) {
    const str = placeholderSplit[i]
    const isInterpolation = i % 2 !== 0

    if (isInterpolation) {
      const interpolationIndex = parseInt(str, 10)
      res.push(interpolationNodes[interpolationIndex])
    } else {
      res.push(str)
    }
  }

  return res
}

// Convert CSS strings back to babel string literals
// and turn arrays back into babel array expressions
export const convertOutputToBabelTypes = arrOfCSSArr => t.arrayExpression(
  arrOfCSSArr.map(cssArr => t.arrayExpression(
    cssArr.map(x => (
      typeof x === 'string' ?
        t.stringLiteral(x) :
        x
    )),
  )),
)

/*
 * Flattens and splits CSS into an array where classname should be injected, and maps these
 * partials to an array with interleaves interpolation nodes.
 * Example:
 * [
 *   [ ':hover { color: blue; background:', props => props.background, '; }' ]
 * ]
 */
export const preprocessHelper = (
  cssArr,
  interpolationNodes,
  transformFlattened = (x => x),
  stylisNamespace = '',
  fixGlobals = false,
) => {
  // Test whether the input is using reserved strings
  if (
    cssArr.some(x => (
      containsPlaceholders(x) ||
      x.includes(temporaryClassname)
    ))
  ) {
    throw new TypeError(
      'CSS Input can\'t contain Styled Components placeholders of the format: __PLACEHOLDER_1__ or __TEMPORARY_CLASSNAME__.',
    )
  }

  const css = transformFlattened(
    assembleAndInterleavePlaceholders(cssArr),
  )

  // Flatten CSS using stylis
  let flattenedCSS = stylis(stylisNamespace, css, false, false).trim()

  if (fixGlobals && flattenedCSS.startsWith('{')) {
    flattenedCSS = fixGlobalPlaceholders(flattenedCSS)
  }

  const classnameSplit = flattenedCSS
    .split(temporaryClassname)
    .filter(x => x !== '')
    .map(str => cssWithPlaceholdersToArr(str, interpolationNodes))

  return classnameSplit
}
