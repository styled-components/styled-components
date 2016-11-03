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

// web components api
import _styledWeb from './constructors/styledWeb'
import _styledWebComponent from './models/StyledWebComponents'

/* Import components */
import ThemeProvider from './models/ThemeProvider'

/* Instantiate singletons */
const keyframes = _keyframes(generateAlphabeticName)
const styled = _styled(_styledComponent(_ComponentStyle(generateAlphabeticName)))
const styledWeb = _styledWeb(_styledWebComponent(_ComponentStyle(generateAlphabeticName)))

/* Export everything */
export default styled
export { css, keyframes, injectGlobal, ThemeProvider, styledWeb }
