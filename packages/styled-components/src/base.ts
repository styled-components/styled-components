/* Import singletons */
import { SC_ATTR, SC_VERSION } from './constants';
import createGlobalStyle from './constructors/createGlobalStyle';
import css from './constructors/css';
import keyframes from './constructors/keyframes';
/* Import Higher Order Components */
import withTheme from './hoc/withTheme';
/* Import hooks */
import ServerStyleSheet from './models/ServerStyleSheet';
import {
  IStyleSheetContext,
  IStyleSheetManager,
  IStylisContext,
  StyleSheetConsumer,
  StyleSheetContext,
  StyleSheetManager,
} from './models/StyleSheetManager';
/* Import components */
import ThemeProvider, { ThemeConsumer, ThemeContext, useTheme } from './models/ThemeProvider';
import isStyledComponent from './utils/isStyledComponent';

/* Warning if you've imported this file on React Native */
if (
  process.env.NODE_ENV !== 'production' &&
  typeof navigator !== 'undefined' &&
  navigator.product === 'ReactNative'
) {
  console.warn(
    `It looks like you've imported 'styled-components' on React Native.\nPerhaps you're looking to import 'styled-components/native'?\nRead more about this at https://www.styled-components.com/docs/basics#react-native`
  );
}

const windowGlobalKey = `__sc-${SC_ATTR}__`;

/* Warning if there are several instances of styled-components */
if (
  process.env.NODE_ENV !== 'production' &&
  process.env.NODE_ENV !== 'test' &&
  typeof window !== 'undefined'
) {
  // @ts-expect-error dynamic key not in window object
  window[windowGlobalKey] ||= 0;

  // @ts-expect-error dynamic key not in window object
  if (window[windowGlobalKey] === 1) {
    console.warn(
      `It looks like there are several instances of 'styled-components' initialized in this application. This may cause dynamic styles to not render properly, errors during the rehydration process, a missing theme prop, and makes your application bigger without good reason.\n\nSee https://s-c.sh/2BAXzed for more info.`
    );
  }

  // @ts-expect-error dynamic key not in window object
  window[windowGlobalKey] += 1;
}

/* Export everything */
export * from './secretInternals';
export { Attrs, DefaultTheme, ShouldForwardProp } from './types';
export {
  IStyleSheetContext,
  IStyleSheetManager,
  IStylisContext,
  ServerStyleSheet,
  StyleSheetConsumer,
  StyleSheetContext,
  StyleSheetManager,
  ThemeConsumer,
  ThemeContext,
  ThemeProvider,
  createGlobalStyle,
  css,
  isStyledComponent,
  keyframes,
  useTheme,
  SC_VERSION as version,
  withTheme,
};
