import { SC_ATTR, SC_VERSION } from './constants';
import createGlobalStyle from './constructors/createGlobalStyle';
import createTheme from './constructors/createTheme';
import css from './constructors/css';
import keyframes from './constructors/keyframes';
import withTheme from './hoc/withTheme';
import ServerStyleSheet from './models/ServerStyleSheet';
import {
  ICompilerContext,
  IStyleSheetContext,
  IStyleSheetManager,
  StyleSheetConsumer,
  StyleSheetContext,
  StyleSheetManager,
} from './models/StyleSheetManager';
import ThemeProvider, { ThemeConsumer, ThemeContext, useTheme } from './models/ThemeProvider';
import extractCSS from './utils/extractCSS';
import isStyledComponent from './utils/isStyledComponent';

if (
  process.env.NODE_ENV !== 'production' &&
  typeof navigator !== 'undefined' &&
  navigator.product === 'ReactNative'
) {
  console.warn(
    `[sc] you've imported 'styled-components' on React Native. Perhaps you're looking to import 'styled-components/native'? See https://styled-components.com/docs/basics#react-native`
  );
}

const windowGlobalKey = `__sc-${SC_ATTR}__`;

if (
  process.env.NODE_ENV !== 'production' &&
  process.env.NODE_ENV !== 'test' &&
  typeof window !== 'undefined'
) {
  // Window doesn't model dynamic string-keyed globals.
  const w = window as unknown as Record<string, number>;
  w[windowGlobalKey] ||= 0;
  if (w[windowGlobalKey] === 1) {
    console.warn(
      `[sc] several instances of 'styled-components' are initialized in this application. This may cause dynamic styles to not render properly, errors during the rehydration process, a missing theme prop, and makes your application bigger without good reason. See https://styled-components.com/docs/faqs#why-am-i-getting-a-warning-about-several-instances-of-module-on-the-page for more info.`
    );
  }
  w[windowGlobalKey] += 1;
}

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
