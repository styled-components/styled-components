import type createGlobalStyle from './createGlobalStyle';

type ThemeLeaf = string | number;

/** Every leaf becomes a string (CSS `var()` on web, sentinel on native). */
export type CSSVarTheme<T> = {
  [K in keyof T]: T[K] extends ThemeLeaf ? string : CSSVarTheme<T[K]>;
};

/**
 * The object returned by `createTheme`. Same shape as the input theme
 * with every leaf replaced by a string, plus a few auxiliary fields
 * that let consumers wire the theme up to their render tree.
 */
export type ThemeContract<T> = CSSVarTheme<T> & {
  /**
   * A component that, when mounted, emits the CSS custom properties on
   * web or acts as a no-op null on native.
   */
  GlobalStyle: ReturnType<typeof createGlobalStyle>;
  /** The original theme object (unmodified). */
  raw: T;
  /** Bare CSS custom-property names (`"--sc-colors-bg"` etc). */
  vars: CSSVarTheme<T>;
  /**
   * Snapshot the current resolved theme. On web, reads computed CSS
   * values from the target element (or `document.documentElement`).
   * On native, returns the default theme (live overrides are already
   * applied at each render via the resolver pass).
   */
  resolve(el?: Element): T;
};
