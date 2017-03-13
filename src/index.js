// @flow

/* Import singletons */
import flatten from './utils/flatten'
import generateAlphabeticName from './utils/generateAlphabeticName'
import css from './constructors/css'
import styleSheet from './models/StyleSheet'

/* Import singleton constructors */
import _styledComponent from './models/StyledComponent'
import _ComponentStyle from './models/ComponentStyle'
import _GlobalStyle from './models/GlobalStyle'
import _styled from './constructors/styled'
import _keyframes from './constructors/keyframes'
import _injectGlobal from './constructors/injectGlobal'

/* Import components */
import ThemeProvider from './models/ThemeProvider'

/* Import Higher Order Components */
import withTheme from './hoc/withTheme'

/* Instantiate singletons */
const GlobalStyle = _GlobalStyle(flatten)
const keyframes = _keyframes(generateAlphabeticName, GlobalStyle)
const injectGlobal = _injectGlobal(GlobalStyle)
const styled = _styled(_styledComponent(_ComponentStyle(generateAlphabeticName, flatten)))

/* Export everything */
export default styled
export { css, keyframes, injectGlobal, ThemeProvider, withTheme, styleSheet }
