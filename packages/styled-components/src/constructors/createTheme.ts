import { IS_BROWSER } from '../constants';
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

/** Shared recursive traversal — calls `leafFn` for each leaf, recurses for objects. */
function walkTheme(
  obj: Record<string, any>,
  varPrefix: string,
  result: Record<string, any>,
  leafFn: (fullPath: string, val: any, key: string) => any,
  path?: string
): void {
  for (const key in obj) {
    const val = obj[key];
    const fullPath = path ? path + '-' + key : key;
    if (typeof val === 'object' && val !== null) {
      const nested: Record<string, any> = {};
      walkTheme(val, varPrefix, nested, leafFn, fullPath);
      result[key] = nested;
    } else {
      result[key] = leafFn(fullPath, val, key);
    }
  }
}

/** Build `var(--prefix-a-b, fallback)` accessor object */
function buildVars<T extends Record<string, any>>(obj: T, varPrefix: string): CSSVarTheme<T> {
  const result: Record<string, any> = {};
  walkTheme(
    obj,
    varPrefix,
    result,
    (fullPath, val) => 'var(--' + varPrefix + fullPath + ', ' + val + ')'
  );
  return result as CSSVarTheme<T>;
}

/** Read computed CSS variable values from the DOM */
function resolveVars<T extends Record<string, any>>(
  obj: T,
  varPrefix: string,
  styles: CSSStyleDeclaration
): T {
  const result: Record<string, any> = {};
  walkTheme(obj, varPrefix, result, (fullPath, val) => {
    const resolved = styles.getPropertyValue('--' + varPrefix + fullPath).trim();
    return resolved || val;
  });
  return result as T;
}

/**
 * Emit CSS var declarations by walking `shape` for structure and reading
 * values from `theme`. This avoids hardcoded skip lists — only keys
 * present in the original theme shape are traversed.
 */
function emitVarDeclarations(
  shape: Record<string, any>,
  theme: Record<string, any>,
  varPrefix: string,
  path?: string
): string {
  let css = '';
  for (const key in shape) {
    const shapeVal = shape[key];
    const themeVal = theme[key];
    const fullPath = path ? path + '-' + key : key;
    if (typeof shapeVal === 'object' && shapeVal !== null) {
      if (typeof themeVal === 'object' && themeVal !== null) {
        css += emitVarDeclarations(shapeVal, themeVal, varPrefix, fullPath);
      }
    } else if (themeVal !== undefined && typeof themeVal !== 'function') {
      css += '--' + varPrefix + fullPath + ':' + themeVal + ';';
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
      ${(p: { theme: Record<string, any> }) => emitVarDeclarations(defaultTheme, p.theme, pfx)}
    }
  `;

  return Object.assign(vars, {
    GlobalStyle,
    raw: defaultTheme,
    resolve(el?: Element): T {
      if (!IS_BROWSER) {
        throw new Error('createTheme.resolve() is client-only');
      }
      const target = el ?? document.documentElement;
      return resolveVars(defaultTheme, pfx, getComputedStyle(target));
    },
  }) as ThemeContract<T>;
}
