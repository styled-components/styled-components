import createGlobalStyle from './createGlobalStyle';

type ThemeLeaf = string | number;

/**
 * Recursively maps a theme object so every leaf value becomes
 * a `var(--sc-path, fallback)` CSS string.
 */
type CSSVarTheme<T> = {
  [K in keyof T]: T[K] extends ThemeLeaf ? string : CSSVarTheme<T[K]>;
};

/**
 * The object returned by `createTheme`. Same shape as the input theme but
 * every leaf is a CSS `var()` reference. Also carries a `GlobalStyle`
 * component and the original `raw` theme object.
 */
type ThemeContract<T> = CSSVarTheme<T> & {
  /**
   * A `createGlobalStyle` component that emits `:root` CSS custom properties
   * from the current ThemeProvider context. Mount this once at the root of
   * your app so RSC components can consume theme values via CSS variables.
   */
  GlobalStyle: ReturnType<typeof createGlobalStyle>;
  /** The original theme object, for passing to `ThemeProvider`. */
  raw: T;
  /**
   * Read the current resolved CSS variable values from the DOM and return
   * an object with the same shape as the original theme. Each leaf is the
   * computed value (e.g. `"#0070f3"`), not the `var()` reference.
   *
   * Optionally pass a target element to read scoped variables from
   * (defaults to `document.documentElement`).
   *
   * Client-only — throws if called on the server.
   */
  resolve(el?: Element): T;
};

/** Recursively build `var(--prefix-a-b, fallback)` accessor object */
function buildVars<T extends Record<string, any>>(
  obj: T,
  varPrefix: string,
  path?: string
): CSSVarTheme<T> {
  const result: Record<string, any> = {};
  for (const key in obj) {
    const val = obj[key];
    const fullPath = path ? path + '-' + key : key;
    if (typeof val === 'object' && val !== null) {
      result[key] = buildVars(val as Record<string, any>, varPrefix, fullPath);
    } else {
      result[key] = 'var(--' + varPrefix + fullPath + ', ' + val + ')';
    }
  }
  return result as CSSVarTheme<T>;
}

/** Recursively read computed CSS variable values from the DOM */
function resolveVars<T extends Record<string, any>>(
  obj: T,
  varPrefix: string,
  styles: CSSStyleDeclaration,
  path?: string
): T {
  const result: Record<string, any> = {};
  for (const key in obj) {
    const val = obj[key];
    const fullPath = path ? path + '-' + key : key;
    if (typeof val === 'object' && val !== null) {
      result[key] = resolveVars(val as Record<string, any>, varPrefix, styles, fullPath);
    } else {
      const resolved = styles.getPropertyValue('--' + varPrefix + fullPath).trim();
      result[key] = resolved || val;
    }
  }
  return result as T;
}

/** Recursively read from `theme` (ThemeProvider context) and emit CSS var declarations */
function emitVarDeclarations(theme: Record<string, any>, varPrefix: string, path?: string): string {
  let css = '';
  for (const key in theme) {
    const val = theme[key];
    const fullPath = path ? path + '-' + key : key;
    if (typeof val === 'object' && val !== null) {
      css += emitVarDeclarations(val as Record<string, any>, varPrefix, fullPath);
    } else {
      css += '--' + varPrefix + fullPath + ':' + val + ';';
    }
  }
  return css;
}

interface CreateThemeOptions {
  /**
   * Prefix for CSS variable names. Defaults to `"sc"`.
   * Useful for isolation when multiple design systems or microfrontends
   * coexist on the same page.
   *
   * @example
   * createTheme(theme, { prefix: 'ds' })
   * // → var(--ds-colors-primary, #0070f3)
   */
  prefix?: string;

  /**
   * CSS selector for the variable declarations. Defaults to `":root"`.
   * Use `":host"` for web components / Shadow DOM, or a class selector
   * for scoped theming.
   *
   * @example
   * createTheme(theme, { selector: ':host' })
   * // → :host { --sc-colors-primary: #0070f3; }
   */
  selector?: string;
}

/**
 * Create a theme contract that bridges `ThemeProvider` and CSS custom properties.
 *
 * Returns an object with the same shape as the input theme, but every leaf value
 * is a `var(--prefix-*, fallback)` CSS string. Use these in styled component
 * templates — they work in both client and RSC contexts.
 *
 * Mount the returned `GlobalStyle` component inside your `ThemeProvider` to emit
 * the CSS variables. When the theme changes (e.g. light → dark), the variables
 * update automatically.
 *
 * @example
 * ```tsx
 * const theme = createTheme({
 *   colors: { primary: '#0070f3', text: '#111' },
 * });
 *
 * // Root layout (client):
 * <ThemeProvider theme={themes[preset]}>
 *   <theme.GlobalStyle />
 *   {children}
 * </ThemeProvider>
 *
 * // Any RSC file:
 * const Card = styled.div`
 *   color: ${theme.colors.primary};
 *   // → "var(--sc-colors-primary, #0070f3)"
 * `;
 * ```
 */
export default function createTheme<T extends Record<string, any>>(
  defaultTheme: T,
  options?: CreateThemeOptions
): ThemeContract<T> {
  const pfx = (options?.prefix ?? 'sc') + '-';
  const sel = options?.selector ?? ':root';
  const vars = buildVars(defaultTheme, pfx);

  const GlobalStyle = createGlobalStyle`
    ${sel} {
      ${(p: { theme: Record<string, any> }) => emitVarDeclarations(p.theme, pfx)}
    }
  `;

  return Object.assign(vars, {
    GlobalStyle,
    raw: defaultTheme,
    resolve(el?: Element): T {
      if (typeof document === 'undefined') {
        throw new Error('createTheme.resolve() is client-only');
      }
      const target = el ?? document.documentElement;
      return resolveVars(defaultTheme, pfx, getComputedStyle(target));
    },
  }) as ThemeContract<T>;
}
