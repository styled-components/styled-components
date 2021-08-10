/* Import singletons */
import { SC_VERSION } from './constants';
import createGlobalStyle from './constructors/createGlobalStyle';
import css from './constructors/css';
import keyframes from './constructors/keyframes';
/* Import Higher Order Components */
import withTheme from './hoc/withTheme';
/* Import hooks */
import useTheme from './hooks/useTheme';
import ServerStyleSheet from './models/ServerStyleSheet';
import StyleSheetManager, {
  StyleSheetConsumer,
  StyleSheetContext,
} from './models/StyleSheetManager';
/* Import components */
import ThemeProvider, { ThemeConsumer, ThemeContext } from './models/ThemeProvider';
import isStyledComponent from './utils/isStyledComponent';

declare const __SERVER__: boolean;

declare global {
  interface Window {
    '__styled-components-init__'?: number;
  }
}

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
  );
}

/* Warning if there are several instances of styled-components */
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test' && typeof window !== 'undefined') {
  window['__styled-components-init__'] ||= 0;

  if (window['__styled-components-init__'] === 1) {
    // eslint-disable-next-line no-console
    console.warn(
      "It looks like there are several instances of 'styled-components' initialized in this application. " +
        'This may cause dynamic styles to not render properly, errors during the rehydration process, ' +
        'a missing theme prop, and makes your application bigger without good reason.\n\n' +
        'See https://s-c.sh/2BAXzed for more info.'
    );
  }

  window['__styled-components-init__'] += 1;
}

/* Export everything */
export * from './secretInternals';
export {
  createGlobalStyle,
  css,
  isStyledComponent,
  keyframes,
  ServerStyleSheet,
  StyleSheetConsumer,
  StyleSheetContext,
  StyleSheetManager,
  ThemeConsumer,
  ThemeContext,
  ThemeProvider,
  useTheme,
  SC_VERSION as version,
  withTheme,
};
