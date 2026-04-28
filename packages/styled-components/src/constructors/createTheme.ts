import { IS_BROWSER } from '../constants';
import * as $ from '../utils/charCodes';
import createGlobalStyle from './createGlobalStyle';
import { walkTheme } from './createTheme.shared';
import type { CSSVarTheme, ThemeContract } from './createTheme.types';

/** Build bare CSS custom property names: `--prefix-a-b` */
function buildVarNames<T extends Record<string, any>>(obj: T, varPrefix: string): CSSVarTheme<T> {
  const result: Record<string, any> = {};
  walkTheme(obj, '-', result, fullPath => '--' + varPrefix + fullPath);
  return result as CSSVarTheme<T>;
}

/** Build `var(--prefix-a-b, fallback)` references with dev-mode parenthesis validation */
function buildVarRefs<T extends Record<string, any>>(obj: T, varPrefix: string): CSSVarTheme<T> {
  const result: Record<string, any> = {};
  walkTheme(obj, '-', result, (fullPath, val) => {
    if (process.env.NODE_ENV !== 'production') {
      const str = String(val);
      let depth = 0;
      for (let i = 0; i < str.length; i++) {
        if (str.charCodeAt(i) === $.OPEN_PAREN) depth++;
        else if (str.charCodeAt(i) === $.CLOSE_PAREN) depth--;
        if (depth < 0) break;
      }
      if (depth !== 0) {
        console.warn(
          `createTheme: value "${str}" at "${fullPath}" contains unbalanced parentheses and may break the var() fallback`
        );
      }
    }
    return 'var(--' + varPrefix + fullPath + ', ' + val + ')';
  });
  return result as CSSVarTheme<T>;
}

/** Read computed CSS variable values from the DOM */
function resolveVars<T extends Record<string, any>>(
  obj: T,
  varPrefix: string,
  styles: CSSStyleDeclaration
): T {
  const result: Record<string, any> = {};
  walkTheme(obj, '-', result, (fullPath, val) => {
    const resolved = styles.getPropertyValue('--' + varPrefix + fullPath).trim();
    return resolved || val;
  });
  return result as T;
}

/**
 * Emit CSS var declarations by walking `shape` for structure and reading
 * values from `theme`. This avoids hardcoded skip lists; only keys
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
 * Create a theme backed by CSS custom properties, bridging `ThemeProvider` and CSS variables.
 *
 * Returns an object with the same shape as the input theme, but every leaf value
 * is a `var(--prefix-*, fallback)` CSS string. Use these in styled component
 * templates; they work in both client and RSC contexts.
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
  const varNames = buildVarNames(defaultTheme, pfx);
  const varRefs = buildVarRefs(defaultTheme, pfx);

  const GlobalStyle = createGlobalStyle`
    ${sel} {
      ${(p: { theme: Record<string, any> }) => emitVarDeclarations(defaultTheme, p.theme, pfx)}
    }
  `;

  return Object.assign(varRefs, {
    GlobalStyle,
    raw: defaultTheme,
    vars: varNames,
    resolve(el?: Element): T {
      if (!IS_BROWSER) {
        throw new Error('createTheme.resolve() is client-only');
      }
      const target = el ?? document.documentElement;
      return resolveVars(defaultTheme, pfx, getComputedStyle(target));
    },
  }) as ThemeContract<T>;
}
