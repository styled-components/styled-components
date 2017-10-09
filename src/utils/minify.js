// @flow
const linebreakPattern = '[\\r\\n]'
const linebreakRegex = new RegExp(`${linebreakPattern}\\s*`, 'g')
const lineCommentStart = /\/\//g
const multilineCommentRegex = new RegExp(`\\/\\*(.|${linebreakPattern})*?\\*\\/`, 'g')
const symbolRegex = /(\s*[;:{},]\s*)/g

// Counts occurences of substr inside str
const countOccurences = (str, substr) => str.split(substr).length - 1

// Detects lines that are exclusively line comments
const isLineComment = line => line.trim().startsWith('//')

// Joins substrings until predicate returns true
const reduceSubstr = (substrs, join, predicate) => {
  const length = substrs.length
  let res = substrs[0]

  if (length === 1) {
    return res
  }

  for (let i = 1; i < length; i += 1) {
    if (predicate(res)) {
      break
    }

    res += join + substrs[i]
  }

  return res
}

// Joins at comment starts when it's inside a string or parantheses
// effectively removing line comments
const stripLineComment = (line: string) => (
  reduceSubstr(line.split(lineCommentStart), '//', str => (
    !str.endsWith(':') && // NOTE: This is another guard against urls, if they're not inside strings or parantheses.
    countOccurences(str, '\'') % 2 === 0 &&
    countOccurences(str, '\"') % 2 === 0 && // eslint-disable-line no-useless-escape
    countOccurences(str, '(') === countOccurences(str, ')')
  ))
)

const compressSymbols = (code: string) => code
  .split(symbolRegex)
  .reduce((str, fragment, index) => {
    // Even-indices are non-symbol fragments
    if (index % 2 === 0) {
      return str + fragment
    }

    // Only manipulate symbols outside of strings
    if (
      countOccurences(str, '\'') % 2 === 0 &&
      countOccurences(str, '\"') % 2 === 0 // eslint-disable-line no-useless-escape
    ) {
      return str + fragment.trim()
    }

    return str + fragment
  }, '')

const minify = (code: string) => {
  const newCode = code
    .replace(multilineCommentRegex, '\n') // Remove multiline comments
    .split(linebreakRegex) // Split at newlines
    .filter(line => line.length > 0 && !isLineComment(line)) // Removes comment only lines
    .map(stripLineComment) // Remove line comments inside text
    .join(' ') // Rejoin all lines

  return compressSymbols(newCode)
}

export default minify
