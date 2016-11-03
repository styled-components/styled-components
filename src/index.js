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

// web components api
import _styledWebComponent from './models/StyledWebComponent'

/* Instantiate singletons */
const keyframes = _keyframes(generateAlphabeticName)
const styled = _styled(_styledComponent(_ComponentStyle(generateAlphabeticName)))
const styledWeb = _styled(_styledWebComponent(_ComponentStyle(generateAlphabeticName)))

/* Export everything */
export default styled
export { css, keyframes, injectGlobal, ThemeProvider, styledWeb }
