/* Import singletons */
import { SC_ATTR, SC_VERSION } from './constants';
import createGlobalStyle from './constructors/createGlobalStyle';
import createTheme from './constructors/createTheme';
import css from './constructors/css';
import keyframes from './constructors/keyframes';
/* Import Higher Order Components */
import withTheme from './hoc/withTheme';
/* Import hooks */
import ServerStyleSheet from './models/ServerStyleSheet';
import {
  ICompilerContext,
  IStyleSheetContext,
  IStyleSheetManager,
  StyleSheetConsumer,
  StyleSheetContext,
  StyleSheetManager,
} from './models/StyleSheetManager';
/* Import components */
import ThemeProvider, { ThemeConsumer, ThemeContext, useTheme } from './models/ThemeProvider';
import extractCSS from './utils/extractCSS';
import isStyledComponent from './utils/isStyledComponent';

/* Warning if you've imported this file on React Native */
if (
  process.env.NODE_ENV !== 'production' &&
  typeof navigator !== 'undefined' &&
  navigator.product === 'ReactNative'
) {
  console.warn(
    `It looks like you've imported 'styled-components' on React Native.\nPerhaps you're looking to import 'styled-components/native'?\nRead more about this at https://styled-components.com/docs/basics#react-native`
  );
}

const windowGlobalKey = `__sc-${SC_ATTR}__`;

/* Warning if there are several instances of styled-components */
if (
  process.env.NODE_ENV !== 'production' &&
  process.env.NODE_ENV !== 'test' &&
  typeof window !== 'undefined'
) {
  // Window doesn't model dynamic string-keyed globals; cast once at the
  // boundary instead of suppressing the same error three times below.
  const w = window as unknown as Record<string, number>;
  w[windowGlobalKey] ||= 0;
  if (w[windowGlobalKey] === 1) {
    console.warn(
      `It looks like there are several instances of 'styled-components' initialized in this application. This may cause dynamic styles to not render properly, errors during the rehydration process, a missing theme prop, and makes your application bigger without good reason.\n\nSee https://styled-components.com/docs/faqs#why-am-i-getting-a-warning-about-several-instances-of-module-on-the-page for more info.`
    );
  }
  w[windowGlobalKey] += 1;
}

/* Export everything */
export * from './secretInternals';
export { Attrs, DefaultTheme, Keyframes, ShouldForwardProp } from './types';
export {
  ICompilerContext,
  IStyleSheetContext,
  IStyleSheetManager,
  ServerStyleSheet,
  StyleSheetConsumer,
  StyleSheetContext,
  StyleSheetManager,
  ThemeConsumer,
  ThemeContext,
  ThemeProvider,
  createGlobalStyle,
  createTheme,
  css,
  extractCSS,
  isStyledComponent,
  keyframes,
  useTheme,
  SC_VERSION as version,
  withTheme,
};
