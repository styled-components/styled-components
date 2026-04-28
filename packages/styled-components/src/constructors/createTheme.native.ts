import { walkTheme } from './createTheme.shared';
import type { ThemeContract } from './createTheme.types';

interface CreateThemeOptions {
  prefix?: string;
  /** Ignored on native; only web uses selector scoping. */
  selector?: string;
}

/**
 * React Native entry for `createTheme`. Leaves are sentinel strings of
 * the form `\0<prefix>:<path>:<fallback>` that the render-time
 * resolver in `src/native/transform/polyfills/resolvers.ts` substitutes
 * with the current `<ThemeProvider>` value. Keeps zero DOM imports so
 * the native bundle can't transitively drag in `createGlobalStyle`.
 *
 * `GlobalStyle` is a no-op null component on native; style variables
 * don't need a cascade-layer root because `<ThemeProvider>` deep-merges
 * overrides into a single resolved theme object each render.
 */
export default function createTheme<T extends Record<string, any>>(
  defaultTheme: T,
  options?: CreateThemeOptions
): ThemeContract<T> {
  const prefix = options?.prefix ?? 'sc';

  const leaves: Record<string, any> = {};
  walkTheme(defaultTheme, '.', leaves, (fullPath, val) => {
    return '\0' + prefix + ':' + fullPath + ':' + val;
  });

  const vars: Record<string, any> = {};
  walkTheme(defaultTheme, '-', vars, fullPath => {
    return '--' + prefix + '-' + fullPath;
  });

  const GlobalStyle = (() => null) as unknown as ThemeContract<T>['GlobalStyle'];

  return Object.assign(leaves, {
    GlobalStyle,
    raw: defaultTheme,
    vars,
    resolve(): T {
      return defaultTheme;
    },
  }) as ThemeContract<T>;
}
