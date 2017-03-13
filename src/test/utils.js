// @flow
/**
 * This sets up our end-to-end test suite, which essentially makes sure
 * our public API works the way we promise/want
 */
import expect from 'expect'

import _styled from '../constructors/styled'
import styleSheet from '../models/StyleSheet'
import flatten from '../utils/flatten'
import _styledComponent from '../models/StyledComponent'
import _ComponentStyle from '../models/ComponentStyle'

/* Ignore hashing, just return class names sequentially as .a .b .c etc */
let index = 0
const classNames = () => String.fromCodePoint(97 + index++)

export const resetStyled = () => {
  styleSheet.reset()
  index = 0
  return _styled(_styledComponent(_ComponentStyle(classNames, flatten)))
}

const stripWhitespace = str => str.trim().replace(/([;\{\}])/g, '$1  ').replace(/\s+/g, ' ')
export const expectCSSMatches = (expectation: string, opts: { ignoreWhitespace: boolean } = { ignoreWhitespace: true }) => {
  const css = styleSheet.getCSS({min: false})
  if (opts.ignoreWhitespace) {
    expect(stripWhitespace(css)).toEqual(stripWhitespace(expectation))
  } else {
    expect(css).toEqual(expectation)
  }
  return css
}
