// @flow

/* Import no-parser singleton variants */
import flatten from './flatten'
import stringifyRules from './stringifyRules'
import css from './css'

/* Import singletons */
import generateAlphabeticName from '../utils/generateAlphabeticName'
import styleSheet from '../models/StyleSheet'

/* Import singleton constructors */
import _StyledComponent from '../models/StyledComponent'
import _ComponentStyle from '../models/ComponentStyle'
import _GlobalStyle from '../models/GlobalStyle'
import _styled from '../constructors/styled'
import _keyframes from '../constructors/keyframes'
import _injectGlobal from '../constructors/injectGlobal'
import _constructWithOptions from '../constructors/constructWithOptions'

/* Import components */
import ThemeProvider from '../models/ThemeProvider'

/* Import Higher Order Components */
import withTheme from '../hoc/withTheme'

/* Instantiate singletons */
const GlobalStyle = _GlobalStyle(flatten, stringifyRules)
const ComponentStyle = _ComponentStyle(generateAlphabeticName, flatten, stringifyRules)
const constructWithOptions = _constructWithOptions(css)
const StyledComponent = _StyledComponent(ComponentStyle, constructWithOptions)

/* Instantiate exported singletons */
const keyframes = _keyframes(generateAlphabeticName, GlobalStyle, css)
const injectGlobal = _injectGlobal(GlobalStyle, css)
const styled = _styled(StyledComponent, constructWithOptions)

/* Export everything */
export default styled
export { css, keyframes, injectGlobal, ThemeProvider, withTheme, styleSheet }
