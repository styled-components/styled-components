'use client';

import { useEffect, useState } from 'react';
import styled, { ThemeProvider, createGlobalStyle } from 'styled-components';
import { type ThemePreset } from '../lib/test-themes';
import { darkThemeVarOverrides, lightThemeVarOverrides } from '../lib/dark-theme-script';
import themeContract from '../lib/theme';

/**
 * Pure-CSS dark mode: vars are set via @media query (auto) or .dark/.light
 * class overrides (manual). No JS needed for the initial paint.
 * ThemeProvider still provides the theme object for interpolations.
 */
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
    background-color: var(--sc-colors-background);
    font-family: system-ui, -apple-system, sans-serif;
    color: var(--sc-colors-text);
    ${p => p.$enableTransition ? 'transition: background-color 0.3s ease, color 0.3s ease;' : ''}
  }
`;

function getSystemTheme(): ThemePreset {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function CustomThemeProvider({ children }: { children: React.ReactNode }) {
  const [override, setOverride] = useState<ThemePreset | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const activeTheme = override ?? getSystemTheme();

  useEffect(() => {
    setHydrated(true);

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onchange = () => {
      if (override === null) {
        // Remove manual class so the media query takes over
        document.documentElement.classList.remove('dark', 'light');
      }
    };
    mql.addEventListener('change', onchange);
    return () => mql.removeEventListener('change', onchange);
  }, [override]);

  useEffect(() => {
    const root = document.documentElement.classList;
    root.remove('dark', 'light');
    if (override) {
      root.add(override);
    }
  }, [override]);

  const toggleTheme = () => {
    setOverride(prev => {
      const current = prev ?? getSystemTheme();
      return current === 'light' ? 'dark' : 'light';
    });
  };

  const label = override
    ? `${override === 'light' ? 'Light' : 'Dark'} mode`
    : hydrated
      ? `Auto (${activeTheme})`
      : 'Auto';

  return (
    <ThemeProvider theme={themeContract}>
      <BaseStyle $enableTransition={hydrated} />
      <ThemeToggle onClick={toggleTheme}>
        {label}
      </ThemeToggle>
      {children}
    </ThemeProvider>
  );
}

const ThemeToggle = styled.button`
  position: fixed;
  top: 20px;
  right: 20px;
  background: var(--sc-colors-primary);
  color: var(--sc-colors-background);
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  z-index: 1000;
  transition: transform 0.15s, opacity 0.15s;

  &:hover {
    opacity: 0.9;
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`;
