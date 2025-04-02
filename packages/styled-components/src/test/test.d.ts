import '../models/ThemeProvider';

declare module '../models/ThemeProvider' {
  // random theme variables used throughout the tests, could consolidate this
  interface DefaultTheme {
    borderRadius?: string;
    color?: string;
    colors?: Record<string, any>;
    fontSize?: number;
    fontSizes?: { sm: string };
    lineHeights?: { sm: string };
    palette?: {
      black: string;
      white: string;
    };
    test?: {
      color: string;
    };
    spacing?: string;
    waz?: string;
  }
}
