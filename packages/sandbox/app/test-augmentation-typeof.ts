// Reproduce the user's exact pattern: typeof a concrete theme object
const myTheme = {
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
  },
  fontSize: {
    small: '12px',
    medium: '16px',
  },
};

export type ThemeInterface = typeof myTheme;
