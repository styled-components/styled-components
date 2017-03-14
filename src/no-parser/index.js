// @flow

/* Import no-parser singleton variants */
import flatten from './flatten'
import stringifyRules from './stringifyRules'

/* Import singletons */
import generateAlphabeticName from '../utils/generateAlphabeticName'
import styleSheet from '../models/StyleSheet'
import css from '../constructors/css'

/* Import singleton constructors */
import _styledComponent from '../models/StyledComponent'
import _ComponentStyle from '../models/ComponentStyle'
import _GlobalStyle from '../models/GlobalStyle'
import _styled from '../constructors/styled'
import _keyframes from '../constructors/keyframes'
import _injectGlobal from '../constructors/injectGlobal'

/* Import components */
import ThemeProvider from '../models/ThemeProvider'

/* Import Higher Order Components */
import withTheme from '../hoc/withTheme'

/* Instantiate singletons */
const GlobalStyle = _GlobalStyle(flatten, stringifyRules)
const keyframes = _keyframes(generateAlphabeticName, GlobalStyle)
const injectGlobal = _injectGlobal(GlobalStyle)
const styled = _styled(_styledComponent(
  _ComponentStyle(generateAlphabeticName, flatten, stringifyRules),
))

/* Export everything */
export default styled
export { css, keyframes, injectGlobal, ThemeProvider, withTheme, styleSheet }
