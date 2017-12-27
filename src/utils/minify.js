// @flow
const linebreakPattern = '[\\r\\n]'
const linebreakRegex = new RegExp(`${linebreakPattern}\\s*`, 'g')
const symbolRegex = /(\s*[;:{},]\s*)/g

// Counts occurences of substr inside str
const countOccurences = (str, substr) => str.split(substr).length - 1

const compressSymbols = (code: string) =>
  code.split(symbolRegex).reduce((str, fragment, index) => {
    // Even-indices are non-symbol fragments
    if (index % 2 === 0) {
      return str + fragment
    }

    // Only manipulate symbols outside of strings
    if (
      countOccurences(str, "'") % 2 === 0 &&
      countOccurences(str, '"') % 2 === 0 // eslint-disable-line no-useless-escape
    ) {
      return str + fragment.trim()
    }

    return str + fragment
  }, '')

const minify = (code: string) => {
  const newCode = code
    .split(linebreakRegex) // Split at newlines
    .join(' ') // Rejoin all lines
    .trim()

  return compressSymbols(newCode)
}

export default minify
