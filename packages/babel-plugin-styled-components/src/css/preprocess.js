import stylis from 'stylis'

// Matches strings that contain an opening curly brace on the same line
const startsWithCurlyBrace = str => /^([^\n\r]+?)?\{/.test(str)

// The capture group makes sure that the split contains the interpolation index
const placeholderRegex = /__PLACEHOLDER_(\d+?)__/

// Checks whether the CSS already contains something that matches our placeholders
const containsPlaceholders = css => !!css.match(placeholderRegex)

const preprocess = (cssArr, ...interpolationNodes) => {
  let css = cssArr[0]

  // Test whether the input is using the reserved placeholder format
  if (css.some(containsPlaceholders)) {
    throw new TypeError(
      `CSS Input can't contain Styled Components placeholders of the format: __PLACEHOLDER_1__.`
    )
  }

  for (let i = 1; i < cssArr.length) {
    const interpolationIndex = i - 1
    const placeholder = `__PLACEHOLDER_${interpolationIndex}__`
    const cssPartial = cssArr[i]

    // Append a semicolon to all interpolations except the onces that are for selectors
    const suffix = !startsWithCurlyBrace(cssPartial) ? ';' : ''

    css += placeholder + suffix + cssPartial
  }

  // Flatten CSS using stylis and split it by our placeholders
  const processedCSS = stylis('&', css)
  const processedCSSArr = processedCSS.split(placeholderRegex)

  const resCSSArr = []
  const resInterpolationNodes = []

  for (let i = 0; i < processedCSSArr.length; i++) {
    const str = processedCSSArr[i]
    const isInterpolation = i % 2 !== 0

    if (isInterpolation) {
      // Guarantees that the resulting interpolations-array is in the right order
      const interpolationIndex = parseInt(str, 10)
      resInterpolationNodes.push(interpolationNodes[interpolationIndex])
    } else {
      resCSSArr.push(str)
    }
  }

  // To be passed to t.callExpression
  return [ resCSSArr, ...resInterpolationNodes ]
}

export default preprocess
