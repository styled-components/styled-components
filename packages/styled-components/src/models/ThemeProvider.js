// @flow
import React, { useContext, useMemo, type Element, type Context } from 'react';
import throwStyledError from '../utils/error';
import isFunction from '../utils/isFunction';

export type Theme = { [key: string]: mixed };

type ThemeArgument = Theme | ((outerTheme?: Theme) => Theme);

type Props = {
  children?: Element<any>,
  theme: ThemeArgument,
};

export const ThemeContext: Context<Theme | void> = React.createContext();

export const ThemeConsumer = ThemeContext.Consumer;

function mergeTheme(theme: ThemeArgument, outerTheme?: Theme): Theme {
  if (!theme) {
    return throwStyledError(14);
  }

  if (isFunction(theme)) {
    const mergedTheme = theme(outerTheme);

    if (
      process.env.NODE_ENV !== 'production' &&
      (mergedTheme === null || Array.isArray(mergedTheme) || typeof mergedTheme !== 'object')
    ) {
      return throwStyledError(7);
    }

    return mergedTheme;
  }

  if (Array.isArray(theme) || typeof theme !== 'object') {
    return throwStyledError(8);
  }

  return outerTheme ? { ...outerTheme, ...theme } : theme;
}

/**
 * Provide a theme to an entire react component tree via context
 */
export default function ThemeProvider(props: Props) {
  const outerTheme = useContext(ThemeContext);
  const themeContext = useMemo(() => mergeTheme(props.theme, outerTheme), [
    props.theme,
    outerTheme,
  ]);

  if (!props.children) {
    return null;
  }

  return <ThemeContext.Provider value={themeContext}>{props.children}</ThemeContext.Provider>;
}
