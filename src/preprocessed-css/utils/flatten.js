// @flow
import type { Preprocessed, FlatPreprocessed, RuleSet } from '../types'

// Detects whether an input is a processed CSS array
const isProcessedCSS = (obj: any): boolean => (
  Array.isArray(obj) &&
  obj.length &&
  Array.isArray(obj[0])
)

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

const flatten = (processedCSS: Preprocessed, executionContext: ?Object): FlatPreprocessed => {
  let subProcessedRules = []

  const filteredRules = processedCSS.reduce((filtered, cssSet) => {
    const selectorSet = parseSelector(cssSet)

    const newCSSSet = cssSet.reduce((acc, raw) => {
      const item = (executionContext && typeof raw === 'function') ?
        raw(executionContext) :
        raw

      if (isProcessedCSS(item)) {
        const subProcessedCSS = flatten(processedCSS, executionContext)
          .map(subset => selectorSet.concat(subset))

        subProcessedRules = subProcessedCSS.concat(subProcessedRules)
      } else if (
        // Remove falsey values
        item !== undefined &&
        item !== null &&
        item !== false &&
        item !== ''
      ) {
        // $FlowFixMe
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
