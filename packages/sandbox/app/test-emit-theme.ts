// This simulates a consumer file that exposes DefaultTheme in its public API,
// forcing TypeScript to emit the type in .d.ts output.
import { DefaultTheme } from 'styled-components';

export function getThemeColor(theme: DefaultTheme) {
  return theme.colors.primary;
}

export function makeTheme(): DefaultTheme {
  return {
    colors: {
      primary: '#fff',
      secondary: '#000',
      text: '#333',
      textMuted: '#666',
      background: '#fff',
      surface: '#f9fafb',
      border: '#e5e7eb',
      accent: '#7c3aed',
      danger: '#dc2626',
      success: '#16a34a',
      warning: '#d97706',
    },
    spacing: { small: '4px', medium: '8px', large: '16px' },
    typography: {
      fontFamily: 'sans-serif',
      fontSize: { small: '12px', medium: '14px', large: '18px' },
    },
  };
}
