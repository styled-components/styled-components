// @flow

/* Import singletons */
import stringifyRules from './utils/stringifyRules'
import isStyledComponent from './utils/isStyledComponent'
import generateAlphabeticName from './utils/generateAlphabeticName'
import css from './constructors/css'
import ServerStyleSheet from './models/ServerStyleSheet'
import StyleSheetManager from './models/StyleSheetManager'

/* Import singleton constructors */
import _keyframes from './constructors/keyframes'
import _createGlobalStyle from './constructors/createGlobalStyle'

/* Import components */
import ThemeProvider, { ThemeConsumer } from './models/ThemeProvider'

/* Import Higher Order Components */
import withTheme from './hoc/withTheme'

/* Warning if you've imported this file on React Native */
if (
  process.env.NODE_ENV !== 'production' &&
  typeof navigator !== 'undefined' &&
  navigator.product === 'ReactNative'
) {
  // eslint-disable-next-line no-console
  console.warn(
    "It looks like you've imported 'styled-components' on React Native.\n" +
      "Perhaps you're looking to import 'styled-components/native'?\n" +
      'Read more about this at https://www.styled-components.com/docs/basics#react-native'
  )
}

/* Warning if there are several instances of styled-components */
if (
  process.env.NODE_ENV !== 'production' &&
  process.env.NODE_ENV !== 'test' &&
  typeof window !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  typeof navigator.userAgent === 'string' &&
  navigator.userAgent.indexOf('Node.js') === -1 &&
  navigator.userAgent.indexOf('jsdom') === -1
) {
  window['__styled-components-init__'] =
    window['__styled-components-init__'] || 0

  if (window['__styled-components-init__'] === 1) {
    // eslint-disable-next-line no-console
    console.warn(
      "It looks like there are several instances of 'styled-components' initialized in this application. " +
        'This may cause dynamic styles not rendering properly, errors happening during rehydration process ' +
        'and makes your application bigger without a good reason.\n\n' +
        'See https://s-c.sh/2BAXzed for more info.'
    )
  }

  window['__styled-components-init__'] += 1
}

/* Instantiate exported singletons */
const keyframes = _keyframes(generateAlphabeticName, stringifyRules, css)
const createGlobalStyle = _createGlobalStyle(stringifyRules, css)
/* Export everything */

export * from './secretInternals'
export {
  css,
  keyframes,
  createGlobalStyle,
  isStyledComponent,
  ThemeConsumer,
  ThemeProvider,
  withTheme,
  ServerStyleSheet,
  StyleSheetManager,
}
