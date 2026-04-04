'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ThemeProvider, createGlobalStyle } from 'styled-components';
import { type ThemePreset } from '../lib/test-themes';
import { darkThemeVarOverrides, lightThemeVarOverrides } from '../lib/dark-theme-script';
import themeContract from '../lib/theme';

interface ThemeToggleContextValue {
  toggle: () => void;
  label: string;
}

const ThemeToggleContext = createContext<ThemeToggleContextValue | null>(null);

export function useThemeToggle() {
  return useContext(ThemeToggleContext);
}

const BaseStyle = createGlobalStyle<{ $enableTransition: boolean }>`
  :root {
    ${lightThemeVarOverrides}
  }

  @media (prefers-color-scheme: dark) {
    :root:not(.light) {
      ${darkThemeVarOverrides}
    }
  }

  :root.dark {
    ${darkThemeVarOverrides}
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    margin: 0;
    display: flex;
    min-height: 100vh;
    background-color: var(--sc-colors-background);
    font-family: system-ui, -apple-system, sans-serif;
    color: var(--sc-colors-text);
    ${p => (p.$enableTransition ? 'transition: background-color 0.3s ease, color 0.3s ease;' : '')}
  }
`;

function getSystemTheme(): ThemePreset {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): ThemePreset | null {
  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {}
  return null;
}

export function CustomThemeProvider({ children }: { children: React.ReactNode }) {
  const [override, setOverride] = useState<ThemePreset | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const overrideRef = useRef(override);
  overrideRef.current = override;

  useEffect(() => {
    setOverride(getStoredTheme());
    setHydrated(true);

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onchange = () => {
      if (overrideRef.current === null) {
        document.documentElement.classList.remove('dark', 'light');
      }
    };
    mql.addEventListener('change', onchange);
    return () => mql.removeEventListener('change', onchange);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement.classList;
    root.remove('dark', 'light');
    if (override) {
      root.add(override);
      localStorage.setItem('theme', override);
    } else {
      localStorage.removeItem('theme');
    }
  }, [override, hydrated]);

  const toggleTheme = useCallback(() => {
    setOverride(prev => {
      if (prev === null) return getSystemTheme() === 'light' ? 'dark' : 'light';
      if (prev === 'dark') return 'light';
      return null;
    });
  }, []);

  const label = override ? `${override === 'light' ? 'Light' : 'Dark'} mode` : 'Auto';
  const toggleValue = useMemo(() => ({ toggle: toggleTheme, label }), [toggleTheme, label]);

  return (
    <ThemeProvider theme={themeContract}>
      <BaseStyle $enableTransition={hydrated} />
      <ThemeToggleContext.Provider value={toggleValue}>{children}</ThemeToggleContext.Provider>
    </ThemeProvider>
  );
}
