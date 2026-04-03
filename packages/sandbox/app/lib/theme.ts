import { createTheme } from 'styled-components';
import { themes } from './test-themes';

/**
 * Theme contract — generates CSS variable accessors from the default (light) theme.
 *
 * Usage in RSC files:
 *   color: ${theme.colors.primary};
 *   // → "var(--sc-colors-primary, #0070f3)"
 *
 * The GlobalStyle component emits :root CSS vars from ThemeProvider context,
 * so switching themes (light → dark) updates the vars automatically.
 */
const theme = createTheme(themes.light);

export default theme;
