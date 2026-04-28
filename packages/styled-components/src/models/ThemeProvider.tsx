import React from 'react';
import { IS_RSC } from '../constants';
import styledError from '../utils/error';
import isFunction from '../utils/isFunction';

// Helper type for the `DefaultTheme` interface that enforces an object type & exclusively allows
// for typed keys.
type DefaultThemeAsObject<T = object> = Record<keyof T, any>;

/**
 * Override DefaultTheme to get accurate typings for your project.
 *
 * ```
 * // create styled-components.d.ts in your project source
 * // if it isn't being picked up, check tsconfig compilerOptions.types
 * import type { CSSProp } from "styled-components";
 * import Theme from './theme';
 *
 * type ThemeType = typeof Theme;
 *
 * declare module "styled-components" {
 *  export interface DefaultTheme extends ThemeType {}
 * }
 *
 * declare module "react" {
 *  interface DOMAttributes<T> {
 *    css?: CSSProp;
 *  }
 * }
 * ```
 */
export interface DefaultTheme extends DefaultThemeAsObject {}

type ThemeFn = (outerTheme?: DefaultTheme | undefined) => DefaultTheme;
type ThemeArgument = DefaultTheme | ThemeFn;

type Props = {
  children?: React.ReactNode;
  theme: ThemeArgument;
};

// Create context only if createContext is available, otherwise create a fallback
export const ThemeContext = !IS_RSC
  ? React.createContext<DefaultTheme | undefined>(undefined)
  : ({
      Provider: ({ children }: { children: React.ReactNode; value?: DefaultTheme }) => children,
      Consumer: ({ children }: { children: (theme?: DefaultTheme) => React.ReactNode }) =>
        children(undefined),
    } as React.Context<DefaultTheme | undefined>);

export const ThemeConsumer = ThemeContext.Consumer;

/**
 * Recursive deep merge; used on native to compose nested `<ThemeProvider>`
 * overrides with the default theme. On web the CSS `var()` cascade handles
 * per-variable inheritance naturally, so a shallow spread suffices. On
 * native there's no cascade: the full resolved theme object must carry
 * every leaf from every ancestor.
 *
 * Only PLAIN objects (prototype `Object.prototype` or `null`) recurse.
 * Class instances, `Date`, `RegExp`, `Map`, `Set`, etc. are taken whole from
 * the inner theme so their prototype methods stay intact.
 */
function isPlainObject(o: unknown): o is Record<string, any> {
  if (o === null || typeof o !== 'object') return false;
  const proto = Object.getPrototypeOf(o);
  return proto === null || proto === Object.prototype;
}

function deepMergeTheme(outer: DefaultTheme | undefined, inner: DefaultTheme): DefaultTheme {
  if (outer == null) return inner;
  const out: Record<string, any> = { ...outer };
  for (const k in inner) {
    if (!Object.prototype.hasOwnProperty.call(inner, k)) continue;
    const v = (inner as Record<string, any>)[k];
    const o = (outer as Record<string, any>)[k];
    if (isPlainObject(v) && isPlainObject(o)) {
      out[k] = deepMergeTheme(o, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function mergeTheme(theme: ThemeArgument, outerTheme?: DefaultTheme | undefined): DefaultTheme {
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

  // Native uses deep-merge so createTheme() sentinel values from the
  // outer theme propagate through unless specifically overridden. The
  // web path keeps its original shallow-spread because the CSS cascade
  // handles per-variable inheritance.
  if (__NATIVE__) {
    return outerTheme ? deepMergeTheme(outerTheme, theme) : theme;
  }
  return outerTheme ? { ...outerTheme, ...theme } : theme;
}

/**
 * Returns the current theme (as provided by the closest ancestor `ThemeProvider`.)
 *
 * If no `ThemeProvider` is found, the function will error. If you need access to the theme in an
 * uncertain composition scenario, `React.useContext(ThemeContext)` will not emit an error if there
 * is no `ThemeProvider` ancestor.
 */
export function useTheme(): DefaultTheme {
  // Skip useContext if we're in an RSC environment without context support
  const theme = !IS_RSC ? React.useContext(ThemeContext) : undefined;

  if (!theme) {
    throw styledError(18);
  }

  return theme;
}

/**
 * Provide a theme to an entire react component tree via context
 */
export default function ThemeProvider(props: Props): React.JSX.Element | null {
  // In RSC environments without context support, ThemeProvider becomes a no-op
  if (IS_RSC) {
    return props.children as React.JSX.Element | null;
  }

  const outerTheme = React.useContext(ThemeContext);
  const themeContext = React.useMemo(
    () => mergeTheme(props.theme, outerTheme),
    [props.theme, outerTheme]
  );

  if (!props.children) {
    return null;
  }

  return <ThemeContext.Provider value={themeContext}>{props.children}</ThemeContext.Provider>;
}
