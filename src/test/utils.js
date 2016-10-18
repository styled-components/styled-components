/**
 * This sets up our end-to-end test suite, which essentially makes sure
 * our public API works the way we promise/want
 */
import expect from 'expect'

import _styled from '../constructors/styled'
import { StyleSheet } from '../vendor/glamor/sheet'
import _styledComponent from '../models/StyledComponent'
import _ComponentStyle from '../models/ComponentStyle'

/* Ignore hashing, just return class names sequentially as .a .b .c etc */
let index = 0
const classNames = () => String.fromCodePoint(97 + index++)

export const resetStyled = () => {
  if (StyleSheet.instance && StyleSheet.instance.sheet) StyleSheet.instance.flush()
  index = 0
  return _styled(_styledComponent(_ComponentStyle(classNames)))
}

const stripWhitespace = str => str.trim().replace(/\s+/g, ' ')
export const expectCSSMatches = (expectation, opts = { ignoreWhitespace: true }) => {
  const css = StyleSheet.instance.rules().map(rule => rule.cssText).join('\n')
  if (opts.ignoreWhitespace) {
    expect(stripWhitespace(css)).toEqual(stripWhitespace(expectation))
  } else {
    expect(css).toEqual(expectation)
  }
  return css
}
