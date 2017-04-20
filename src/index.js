// @flow

/* Import singletons */
import generateAlphabeticName from './utils/generateAlphabeticName'
import css from './constructors/css'
import injectGlobal from './constructors/injectGlobal'

/* Import singleton constructors */
import _styledComponent from './models/StyledComponent'
import _styled from './constructors/styled'
import _keyframes from './constructors/keyframes'
import _ComponentStyle from './models/ComponentStyle'

/* Import components */
import ThemeProvider from './models/ThemeProvider'

/* Import Higher Order Components */
import withTheme from './hoc/withTheme'

/* Emoji cx generator */
import toEmoji from './toEmoji'

/* Instantiate singletons */
const keyframes = _keyframes(toEmoji)
const styled = _styled(_styledComponent(_ComponentStyle(toEmoji)))

/* Export everything */
export default styled
export { css, keyframes, injectGlobal, ThemeProvider, withTheme }
