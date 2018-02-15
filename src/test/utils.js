// @flow
/**
 * This sets up our end-to-end test suite, which essentially makes sure
 * our public API works the way we promise/want
 */
import _styled from '../constructors/styled'
import css from '../constructors/css'
import _constructWithOptions from '../constructors/constructWithOptions'
import StyleSheet from '../models/StyleSheet'
import flatten from '../utils/flatten'
import stringifyRules from '../utils/stringifyRules'
import _StyledComponent from '../models/StyledComponent'
import _ComponentStyle from '../models/ComponentStyle'

import noParserCss from '../no-parser/css'
import noParserFlatten from '../no-parser/flatten'
import noParserStringifyRules from '../no-parser/stringifyRules'

/* Ignore hashing, just return class names sequentially as .a .b .c etc */
let index = 0
let inputs = {}
let seededClassnames = []

const classNames = input => {
  const seed = seededClassnames.shift()
  if (seed) return seed

  return inputs[input] || (inputs[input] = String.fromCodePoint(97 + index++))
}

export const seedNextClassnames = (names: Array<string>) =>
  (seededClassnames = names)
export const resetStyled = (isServer: boolean = false) => {
  if (!isServer) {
    if (!document.head) {
      throw new Error(
        process.env.NODE_ENV !== 'production' ? 'Missing document <head>' : ''
      )
    }
    document.head.innerHTML = ''
  }

  StyleSheet.reset(isServer)
  index = 0
  inputs = {}

  const ComponentStyle = _ComponentStyle(classNames, flatten, stringifyRules)
  const constructWithOptions = _constructWithOptions(css)
  const StyledComponent = _StyledComponent(ComponentStyle, constructWithOptions)

  return _styled(StyledComponent, constructWithOptions)
}

export const resetNoParserStyled = () => {
  if (!document.head) {
    throw new Error(
      process.env.NODE_ENV !== 'production' ? 'Missing document <head>' : ''
    )
  }
  document.head.innerHTML = ''
  StyleSheet.reset()
  index = 0

  const ComponentStyle = _ComponentStyle(
    classNames,
    noParserFlatten,
    noParserStringifyRules
  )
  const constructWithOptions = _constructWithOptions(noParserCss)
  const StyledComponent = _StyledComponent(ComponentStyle, constructWithOptions)

  return _styled(StyledComponent, constructWithOptions)
}

const stripComments = (str: string) => str.replace(/\/\*.*?\*\/\n?/g, '')

export const stripWhitespace = (str: string) =>
  str
    .trim()
    .replace(/([;\{\}])/g, '$1  ')
    .replace(/\s+/g, ' ')

export const getCSS = (scope?: Document | HTMLElement = document) => {
  return Array.from(scope.querySelectorAll('style'))
    .map(tag => tag.innerHTML)
    .join('\n')
    .replace(/ {/g, '{')
    .replace(/:\s+/g, ':')
    .replace(/:\s+;/g, ':;')
}

export const expectCSSMatches = (
  _expectation: string,
  opts: { ignoreWhitespace: boolean } = { ignoreWhitespace: true }
) => {
  // NOTE: This should normalise both CSS strings to make irrelevant mismatches less likely
  const expectation = _expectation
    .replace(/ {/g, '{')
    .replace(/:\s+/g, ':')
    .replace(/:\s+;/g, ':;')

  const css = getCSS()

  if (opts.ignoreWhitespace) {
    const stripped = stripWhitespace(stripComments(css))
    expect(stripped).toEqual(stripWhitespace(expectation))
    return stripped
  } else {
    expect(css).toEqual(expectation)
    return css
  }
}
