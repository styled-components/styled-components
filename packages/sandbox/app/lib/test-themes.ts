export type ThemePreset = 'light' | 'dark';

export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    text: string;
    textMuted: string;
    background: string;
    surface: string;
    border: string;
    accent: string;
    danger: string;
    success: string;
    warning: string;
  };
  spacing: {
    small: string;
    medium: string;
    large: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      small: string;
      medium: string;
      large: string;
    };
  };
}

export const themes: Record<ThemePreset, Theme> = {
  light: {
    colors: {
      primary: '#0070f3',
      secondary: '#0891b2',
      text: '#111827',
      textMuted: '#6b7280',
      background: '#ffffff',
      surface: '#f9fafb',
      border: '#e5e7eb',
      accent: '#7c3aed',
      danger: '#dc2626',
      success: '#16a34a',
      warning: '#d97706',
    },
    spacing: {
      small: '8px',
      medium: '16px',
      large: '24px',
    },
    typography: {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: {
        small: '14px',
        medium: '16px',
        large: '24px',
      },
    },
  },
  dark: {
    colors: {
      primary: '#3b82f6',
      secondary: '#22d3ee',
      text: '#f9fafb',
      textMuted: '#9ca3af',
      background: '#111827',
      surface: '#1f2937',
      border: '#374151',
      accent: '#a78bfa',
      danger: '#ef4444',
      success: '#22c55e',
      warning: '#f59e0b',
    },
    spacing: {
      small: '8px',
      medium: '16px',
      large: '24px',
    },
    typography: {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: {
        small: '14px',
        medium: '16px',
        large: '24px',
      },
    },
  },
};

export const defaultTheme = themes.light;
