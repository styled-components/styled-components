// @flow

/* Import singletons */
import flatten from './utils/flatten'
import stringifyRules from './utils/stringifyRules'
import isStyledComponent from './utils/isStyledComponent'
import consolidateStreamedStyles from './utils/consolidateStreamedStyles'
import generateAlphabeticName from './utils/generateAlphabeticName'
import css from './constructors/css'
import ServerStyleSheet from './models/ServerStyleSheet'
import StyleSheetManager from './models/StyleSheetManager'

/* Import singleton constructors */
import _StyledComponent from './models/StyledComponent'
import _ComponentStyle from './models/ComponentStyle'
import _styled from './constructors/styled'
import _keyframes from './constructors/keyframes'
import _injectGlobal from './constructors/injectGlobal'
import _constructWithOptions from './constructors/constructWithOptions'

/* Import components */
import ThemeProvider from './models/ThemeProvider'

/* Import Higher Order Components */
import withTheme from './hoc/withTheme'

/* Warning if you've imported this file on React Native */
if (
  process.env.NODE_ENV !== 'production' &&
  typeof navigator !== 'undefined' &&
  navigator.product === 'ReactNative'
) {
  console.warn(
    "It looks like you've imported 'styled-components' on React Native.\n" +
      "Perhaps you're looking to import 'styled-components/native'?\n" +
      'Read more about this at https://www.styled-components.com/docs/basics#react-native'
  )
}

/* Instantiate singletons */
const ComponentStyle = _ComponentStyle(
  generateAlphabeticName,
  flatten,
  stringifyRules
)
const constructWithOptions = _constructWithOptions(css)
const StyledComponent = _StyledComponent(ComponentStyle, constructWithOptions)

/* Instantiate exported singletons */
const keyframes = _keyframes(generateAlphabeticName, stringifyRules, css)
const injectGlobal = _injectGlobal(stringifyRules, css)
const styled = _styled(StyledComponent, constructWithOptions)

/* Export everything */

export * from './secretInternals'
export default styled
export {
  css,
  keyframes,
  injectGlobal,
  isStyledComponent,
  consolidateStreamedStyles,
  ThemeProvider,
  withTheme,
  ServerStyleSheet,
  StyleSheetManager,
}
