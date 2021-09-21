import React, { useContext, useMemo } from 'react';
import styledError from '../utils/error';
import isFunction from '../utils/isFunction';

export const MQ_THEME_KEY = '_sc_media';

export type Theme = {
  [MQ_THEME_KEY]?: {
    [key: string]: any;
  };
  [key: string]: any;
};

type ThemeFn = (outerTheme?: Theme) => Theme;
type ThemeArgument = Theme | ThemeFn;

type Props = {
  children?: React.ReactChild;
  theme: ThemeArgument;
};

export const ThemeContext = React.createContext<Theme | undefined>(undefined);

export const ThemeConsumer = ThemeContext.Consumer;

function mergeTheme(theme: ThemeArgument, outerTheme?: Theme): Theme {
  if (!theme) {
    throw styledError(14);
  }

  if (isFunction(theme)) {
    const themeFn = theme as ThemeFn;
    const mergedTheme = themeFn(outerTheme);

    if (
      process.env.NODE_ENV !== 'production' &&
      (mergedTheme === null || Array.isArray(mergedTheme) || typeof mergedTheme !== 'object')
    ) {
      throw styledError(7);
    }

    return mergedTheme;
  }

  if (Array.isArray(theme) || typeof theme !== 'object') {
    throw styledError(8);
  }

  return outerTheme ? { ...outerTheme, ...theme } : theme;
}

function synthesizeCSSVariables(obj: { [key: string]: any }, parentKey = ''): string {
  let vars = '';
  let needsToEmitMediaQueries = false;

  if (!parentKey) {
    vars += ':root{';
  }

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (key === MQ_THEME_KEY) {
        needsToEmitMediaQueries = true;
      } else if (typeof obj[key] !== 'object') {
        vars += `${normalizeKeyName(parentKey ? `${parentKey}.${key}` : key)}: ${obj[key]};`;
      } else {
        vars += synthesizeCSSVariables(obj[key], key);
      }
    }
  }

  if (!parentKey) vars += '}';

  if (needsToEmitMediaQueries) {
    for (const query in obj[MQ_THEME_KEY]) {
      if (obj[MQ_THEME_KEY].hasOwnProperty(query)) {
        vars += `@media (${query}){${synthesizeCSSVariables(obj[MQ_THEME_KEY][query])}}\n`;
      }
    }
  }

  return vars;
}

function normalizeKeyName(key: string): string {
  return `--sc-${key
    .toLowerCase()
    .split('.')
    .map(x => x.replace(/[^A-Z0-9]/gi, '-').replace(/-{2,}/g, '-'))
    .join('-')}`;
}

// thank you https://www.reddit.com/r/typescript/comments/iywewf/comment/g6fh1m5/?utm_source=share&utm_medium=web2x&context=3
type PropsPath<T extends Theme> = {
  [P in keyof T]: T[P] extends Theme
    ? `${string & P}` | `${string & P}.${PropsPath<T[P]>}`
    : `${string & P}`;
}[T extends any[] ? number & keyof T : keyof T];

/**
 * Given a theme key path (dot-delimited like JS), consume the appropriate emitted CSS variable
 * taking into account any provided media query adjustments.
 *
 * e.g.
 *
 * ```
 * styled.div`
 *   color: ${cssvar('color')};
 * `
 * ```
 */
export function cssvar<T = Theme>(key: PropsPath<T>): string {
  // @ts-expect-error it's fine
  return `var(${normalizeKeyName(String(key))})`;
}

/**
 * Provide a theme to an entire react component tree via context
 */
export default function ThemeProvider(props: Props): JSX.Element | null {
  const outerTheme = useContext(ThemeContext);
  const themeContext = useMemo(
    () => mergeTheme(props.theme, outerTheme),
    [props.theme, outerTheme]
  );

  /**
   * Synthesize CSS variables from theme.
   */
  const cssVars = useMemo(() => {
    if (themeContext) {
      return synthesizeCSSVariables(themeContext);
    }
  }, [themeContext]);

  if (!props.children) {
    return null;
  }

  return (
    <ThemeContext.Provider value={themeContext}>
      {cssVars && <style dangerouslySetInnerHTML={{ __html: cssVars }} />}
      {props.children}
    </ThemeContext.Provider>
  );
}
