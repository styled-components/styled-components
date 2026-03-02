// This simulates a consumer file that exposes DefaultTheme in its public API,
// forcing TypeScript to emit the type in .d.ts output.
import { DefaultTheme } from 'styled-components';

export function getThemeColor(theme: DefaultTheme) {
  return theme.colors.primary;
}

export function makeTheme(): DefaultTheme {
  return {
    colors: { primary: '#fff', secondary: '#000', text: '#333', background: '#fff' },
    spacing: { small: '4px', medium: '8px', large: '16px' },
    typography: {
      fontFamily: 'sans-serif',
      fontSize: { small: '12px', medium: '14px', large: '18px' },
    },
  };
}
