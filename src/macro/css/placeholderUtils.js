/* eslint-disable */

// The capture group makes sure that the split contains the interpolation index
const placeholderRegex = /__PLACEHOLDER_(\d+?)__/

// Alternative regex that splits without a capture group
const placeholderNonCapturingRegex = /__PLACEHOLDER_(?:\d+?)__/

// This matches the global group w/o a selector
const globalRulesetRegex = /^{([^}]*)}/

// Return position of needle in string or Infinity
const findIndex = (string, needle) => {
  const index = string.indexOf(needle)
  return index > -1 ? index : Infinity
}

// Looks if the CSS partial after mixin needs to be prefixed with a semicolon
export const isUnendedMixin = css => {
  const newlinePos = findIndex(css, '\n')
  const semicolonPos = findIndex(css, ';')
  const colonPos = findIndex(css, ':')
  const openParensPos = findIndex(css, '{')
  const closingParensPos = findIndex(css, '}')

  const isNewlineFirst = (
    isFinite(newlinePos) &&
    newlinePos === Math.min(
      newlinePos,
      semicolonPos,
      colonPos,
      openParensPos,
      closingParensPos,
    )
  )

  // If newline isn't first, prefixed interpolation can't be a mixin
  if (!isNewlineFirst) {
    return false
  }

  const minCharPos = Math.min(
    semicolonPos,
    colonPos,
    openParensPos,
    closingParensPos,
  )

  // If this is followed by a semicolon or colon, then we don't want to add a semicolon
  return (
    isFinite(minCharPos) &&
    minCharPos !== semicolonPos
  )
}

// Generates a placeholder from an index
export const makePlaceholder = index => `__PLACEHOLDER_${index}__`

// Our temporary classname
export const temporaryClassname = '__TEMPORARY_CLASSNAME__'

// Checks whether the CSS already contains something that matches our placeholders
export const containsPlaceholders = css => !!css.match(placeholderRegex)

// Splits CSS by placeholders
export const splitByPlaceholders = (css, capture = true) => css
  .split(capture ? placeholderRegex : placeholderNonCapturingRegex)

// Remove curly braces around global placeholders
// We need to replace mixin-semicolons with newlines to not break browser CSS parsing
export const fixGlobalPlaceholders = css => css.replace(globalRulesetRegex, (_, p1) => (
  p1 ?
    p1.replace(';', '\n') :
    ''
))
