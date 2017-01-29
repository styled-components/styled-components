// The capture group makes sure that the split contains the interpolation index
const placeholderRegex = /__PLACEHOLDER_(\d+?)__/

// Matches strings that contain an opening curly brace on the same line
export const startsWithCurlyBrace = str => /^([^\n\r\}:;]+?)?\{/.test(str)

// Generates a placeholder from an index
export const makePlaceholder = index => `__PLACEHOLDER_${index}__`

// Our temporary classname
export const temporaryClassname = '__TEMPORARY_CLASSNAME__'

// Checks whether the CSS already contains something that matches our placeholders
export const containsPlaceholders = css => !!css.match(placeholderRegex)

// Splits CSS by placeholders
export const splitByPlaceholders = css => css.split(placeholderRegex)
