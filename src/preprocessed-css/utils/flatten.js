// @flow
import type { Preprocessed, RuleSet } from '../types'

// Slices the part of the css-set that contains the selector
// Also slices the substrings as necessary
const parseSelector = (cssSet: RuleSet): RuleSet => {
  let hasCurlyBrace = false
  const result = []
  const size = cssSet.length

  for (let i = 0; i < size; i += 1) {
    const css = cssSet[i]

    if (typeof css === 'string') {
      const curlyBraceIndex = css.indexOf('{')
      if (curlyBraceIndex > -1) {
        hasCurlyBrace = true
        result.push(css.slice(0, curlyBraceIndex))
        break
      }
    }

    result.push(css)
  }

  if (!hasCurlyBrace) {
    throw new TypeError('Failed to parse processed CSS!')
  }

  return result
}

const flatten = (processedCSS: Preprocessed, executionContext: ?Object): Preprocessed => {
  let subProcessedRules = []

  const filteredRules = processedCSS.reduce((filtered, cssSet) => {
    const selectorSet = parseSelector(cssSet)

    const newCSSSet = cssSet.reduce((acc, raw) => {
      const item = (executionContext && typeof raw === 'function') ?
        raw(executionContext) :
        raw

      if (Array.isArray(item) && item.every(Array.isArray)) {
        const subProcessedCSS = flatten(
          item.map(subset => selectorSet.concat(subset)),
          executionContext,
        )

        subProcessedRules = subProcessedRules.concat(subProcessedCSS)
      } else if (
        // Remove falsey values
        item !== undefined &&
        item !== null &&
        item !== false &&
        item !== ''
      ) {
        acc.push(item)
      }

      return acc
    }, [])

    filtered.push(newCSSSet)
    return filtered
  }, [])

  return filteredRules.concat(subProcessedRules)
}

export default flatten
