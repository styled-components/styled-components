import { createTheme } from 'styled-components/native';

const lightTheme = {
  colors: {
    bg: '#f5f3ee',
    surface: '#f5f3ee',
    surfaceMuted: '#ebe7df',
    border: '#cdc7b8',
    rule: '#cdc7b8',
    ink: '#0e0e10',
    fg: '#0e0e10',
    fgMuted: '#46464a',
    fgFaint: '#7c7c80',
    signal: '#0e0e10',
    signalSoft: '#ebe7df',
    pass: '#1f7a52',
    fail: '#c8243a',
    accent: '#0e0e10',
    accentSoft: '#ebe7df',
  },
  space: { xxs: 5, xs: 8, sm: 13, md: 21, lg: 34, xl: 55 },
  radius: { sm: 0, md: 0, lg: 0, pill: 999 },
  borderWidth: { hairline: 1, heavy: 2 },
  fontSize: {
    mono: 12,
    monoSm: 11,
    brief: 14,
    body: 15,
    eyebrow: 11,
    title: 19,
    display: 26,
  },
  fontFamily: {
    body: 'Figtree_400Regular',
    strong: 'Figtree_500Medium',
    heading: 'Figtree_600SemiBold',
    mono: 'JetBrainsMono_400Regular',
    monoStrong: 'JetBrainsMono_500Medium',
  },
  lineHeight: {
    body: 22,
    brief: 20,
    mono: 18,
    title: 24,
    display: 30,
  },
  font: {
    body: '15px',
    title: '19px',
    display: '26px',
  },
};

const darkTheme: typeof lightTheme = {
  colors: {
    bg: '#0e0e10',
    surface: '#0e0e10',
    surfaceMuted: '#1a1a1d',
    border: '#3a3a3f',
    rule: '#3a3a3f',
    ink: '#f5f3ee',
    fg: '#f5f3ee',
    fgMuted: '#a8a8ac',
    fgFaint: '#6c6c70',
    signal: '#f5f3ee',
    signalSoft: '#1a1a1d',
    pass: '#5dd4a3',
    fail: '#ff6b80',
    accent: '#f5f3ee',
    accentSoft: '#1a1a1d',
  },
  space: lightTheme.space,
  radius: lightTheme.radius,
  borderWidth: lightTheme.borderWidth,
  fontSize: lightTheme.fontSize,
  fontFamily: lightTheme.fontFamily,
  lineHeight: lightTheme.lineHeight,
  font: lightTheme.font,
};

export const theme = createTheme(lightTheme);
export { lightTheme, darkTheme };
export type ShowcaseTheme = typeof lightTheme;
