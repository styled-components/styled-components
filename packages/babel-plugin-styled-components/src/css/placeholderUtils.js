// The capture group makes sure that the split contains the interpolation index
const placeholderRegex = /__PLACEHOLDER_(\d+?)__/

// This matches the global group w/o a selector
const globalRulesetRegex = /^{([^}]*)}/

const lastInArr = arr => arr[arr.length - 1]

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
      closingParensPos
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
    closingParensPos
  )

  // If this is followed by an open parens, it should be a selector
  // If this is followed by a semicolon, then we don't need one
  return (
    isFinite(minCharPos) &&
    minCharPos !== openParensPos &&
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
export const splitByPlaceholders = css => css.split(placeholderRegex)

// Remove curly braces around global placeholders
export const fixGlobalPlaceholders = css => css.replace(globalRulesetRegex, '$1')
