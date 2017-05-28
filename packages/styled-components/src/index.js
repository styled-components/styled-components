// @flow

/* Import singletons */
import flatten from './utils/flatten'
import stringifyRules from './utils/stringifyRules'
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

/* Instantiate singletons */
const ComponentStyle = _ComponentStyle(generateAlphabeticName, flatten, stringifyRules)
const constructWithOptions = _constructWithOptions(css)
const StyledComponent = _StyledComponent(ComponentStyle, constructWithOptions)

/* Instantiate exported singletons */
const keyframes = _keyframes(generateAlphabeticName, stringifyRules, css)
const injectGlobal = _injectGlobal(stringifyRules, css)
const styled = _styled(StyledComponent, constructWithOptions)

/* Export everything */
export default styled
export {
  css,
  keyframes,
  injectGlobal,
  ThemeProvider,
  withTheme,
  ServerStyleSheet,
  StyleSheetManager,
}
