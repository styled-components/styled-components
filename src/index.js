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

/* Instantiate singletons */
const keyframes = _keyframes(generateAlphabeticName)
const styled = _styled(_styledComponent(_ComponentStyle(generateAlphabeticName)))

// before fix Bug [Export default] #115
/* Export everything */
// export default styled
// export { css, keyframes, injectGlobal, ThemeProvider }

// fix Bug [Export default] #115
const styledComponent = {}
Object.keys(styled)
  .map(ele => (styledComponent[ele] = styled[ele]))

styledComponent.css = css
styledComponent.keyframes = keyframes
styledComponent.injectGlobal = injectGlobal
styledComponent.ThemeProvider = ThemeProvider
// export default
export default styledComponent
