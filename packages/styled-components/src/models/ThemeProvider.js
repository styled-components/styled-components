// @flow
import React, { useContext, type Element, type Context } from 'react';
import StyledError from '../utils/error';
import isFunction from '../utils/isFunction';

export type Theme = { [key: string]: mixed };

type Props = {
  children?: Element<any>,
  theme: Theme | ((outerTheme: Theme) => void),
};

export const ThemeContext: Context<Theme | void> = React.createContext();

export const ThemeConsumer = ThemeContext.Consumer;

function useMergedTheme(theme: Theme | ((outerTheme?: Theme) => Theme), outerTheme?: Theme): Theme {
  if (isFunction(theme)) {
    const mergedTheme = theme(outerTheme);

    if (
      process.env.NODE_ENV !== 'production' &&
      (mergedTheme === null || Array.isArray(mergedTheme) || typeof mergedTheme !== 'object')
    ) {
      throw new StyledError(7);
    }

    return mergedTheme;
  }

  if (theme === null || Array.isArray(theme) || typeof theme !== 'object') {
    throw new StyledError(8);
  }

  return outerTheme ? { ...outerTheme, ...theme } : theme;
}

/**
 * Provide a theme to an entire react component tree via context
 */
export default function ThemeProvider(props: Props) {
  const outerTheme = useContext(ThemeContext);
  // NOTE: can't really memoize with props.theme as that'd cause incorrect memoization when it's a function
  const themeContext = useMergedTheme(props.theme, outerTheme);

  if (!props.children) {
    return null;
  }

  return (
    <ThemeContext.Provider value={themeContext}>
      {React.Children.only(props.children)}
    </ThemeContext.Provider>
  );
}
