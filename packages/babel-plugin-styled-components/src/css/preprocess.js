import stylis from 'stylis'

// Matches strings that contain an opening curly brace on the same line
const startsWithCurlyBrace = str => /^([^\n\r]+?)?\{/.test(str)

// Generates a placeholder from an index
const makePlaceholder = index => `__PLACEHOLDER_${index}__`

// The capture group makes sure that the split contains the interpolation index
const placeholderRegex = /__PLACEHOLDER_(\d+?)__/

// Our temporary classname
const temporaryClassname = '__TEMPORARY_CLASSNAME__'

// Checks whether the CSS already contains something that matches our placeholders
const containsPlaceholders = css => !!css.match(placeholderRegex)

// Assembles CSS partials and replaces interpolations with placeholders
export const assembleAndInterleavePlaceholders = cssArr => {
  let css = cssArr[0]

  for (let i = 1; i < cssArr.length; i++) {
    const interpolationIndex = i - 1
    const placeholder = makePlaceholder(interpolationIndex)
    const cssPartial = cssArr[i]

    // Append a semicolon to all interpolations except the onces that are for selectors
    const suffix = !startsWithCurlyBrace(cssPartial) ? ';' : ''

    css += placeholder + suffix + cssPartial
  }

  return css
}

// Splits the css into an array with interleaved interpolation nodes
export const cssWithPlaceholdersToArr = (css, interpolationNodes) => {
  const placeholderSplit = css.trim().split(placeholderRegex)
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

/*
 * Flattens and splits CSS into an array where classname should be injected, and maps these
 * partials to an array with interleaves interpolation nodes.
 * Example:
 * [
 *   [ ':hover { color: blue; background:', props => props.background, '; }' ]
 * ]
 */
const preprocess = (cssArr, ...interpolationNodes) => {

  // Test whether the input is using reserved strings
  if (
    cssArr.some(x => (
      containsPlaceholders(x) ||
      x.includes(temporaryClassname)
    ))
  ) {
    throw new TypeError(
      `CSS Input can't contain Styled Components placeholders of the format: __PLACEHOLDER_1__ or __TEMPORARY_CLASSNAME__.`
    )
  }

  const css = assembleAndInterleavePlaceholders(cssArr)

  // Flatten CSS using stylis and split it by our temporary classname
  const processedCSS = stylis(temporaryClassname, css)

  const classnameSplit = processedCSS
    .split(temporaryClassname)
    .filter(Boolean)
    .map(str => cssWithPlaceholdersToArr(css, interpolationNodes))

  return classnameSplit
}

export default preprocess
