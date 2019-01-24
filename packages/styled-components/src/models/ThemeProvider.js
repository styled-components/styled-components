// @flow
import React, { createContext, useContext, useMemo, type Element } from 'react';
import StyledError from '../utils/error';
import isFunction from '../utils/isFunction';

export type Theme = { [key: string]: mixed };

type Props = {
  children?: Element<any>,
  theme: Theme | ((outerTheme: Theme) => void),
};

export const ThemeContext = createContext();

export const ThemeConsumer = ThemeContext.Consumer;

function getTheme(theme: (outerTheme: ?Theme) => void, outerTheme: ?Theme) {
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

  return { ...outerTheme, ...theme };
}

/**
 * Provide a theme to an entire react component tree via context
 */
export default function ThemeProvider(props: Props) {
  const outerTheme = useContext(ThemeContext);
  const themeContext = useMemo(() => getTheme(props.theme, outerTheme), [props.theme, outerTheme]);

  if (!props.children) {
    return null;
  }

  return (
    <ThemeContext.Provider value={themeContext}>
      {React.Children.only(props.children)}
    </ThemeContext.Provider>
  );
}
