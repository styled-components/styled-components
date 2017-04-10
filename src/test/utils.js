// @flow
/**
 * This sets up our end-to-end test suite, which essentially makes sure
 * our public API works the way we promise/want
 */
import _styled from '../constructors/styled'
import css from '../constructors/css'
import _constructWithOptions from '../constructors/constructWithOptions'
import StyleSheet from '../models/BrowserStyleSheet'
import flatten from '../utils/flatten'
import stringifyRules from '../utils/stringifyRules'
import _StyledComponent from '../models/StyledComponent'
import _ComponentStyle from '../models/ComponentStyle'

import noParserCss from '../no-parser/css'
import noParserFlatten from '../no-parser/flatten'
import noParserStringifyRules from '../no-parser/stringifyRules'

/* Ignore hashing, just return class names sequentially as .a .b .c etc */
let index = 0
const classNames = () => String.fromCodePoint(97 + index++)

export const resetStyled = () => {
  document.head.innerHTML = ''
  StyleSheet.reset()

  const existingStyleElement = document.head.childNodes[0]
  if (existingStyleElement) existingStyleElement.textContent = ''

  index = 0

  const ComponentStyle = _ComponentStyle(classNames, flatten, stringifyRules)
  const constructWithOptions = _constructWithOptions(css)
  const StyledComponent = _StyledComponent(ComponentStyle, constructWithOptions)

  return _styled(StyledComponent, constructWithOptions)
}

export const resetNoParserStyled = () => {
  document.head.innerHTML = ''
  StyleSheet.reset()
  index = 0

  const ComponentStyle = _ComponentStyle(classNames, noParserFlatten, noParserStringifyRules)
  const constructWithOptions = _constructWithOptions(noParserCss)
  const StyledComponent = _StyledComponent(ComponentStyle, constructWithOptions)

  return _styled(StyledComponent, constructWithOptions)
}

const stripWhitespace = str => str.trim().replace(/([;\{\}])/g, '$1  ').replace(/\s+/g, ' ')
export const expectCSSMatches = (expectation: string, opts: { ignoreWhitespace: boolean } = { ignoreWhitespace: true }) => {
  const css = StyleSheet.instance.getCSS({ min: false })

  if (opts.ignoreWhitespace) {
    expect(stripWhitespace(css)).toEqual(stripWhitespace(expectation))
  } else {
    expect(css).toEqual(expectation)
  }
  return css
}
