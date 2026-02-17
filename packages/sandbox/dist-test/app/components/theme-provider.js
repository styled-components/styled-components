'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { ThemeProvider, createGlobalStyle } from 'styled-components';
import { themes } from '../lib/test-themes';
import styled from 'styled-components';
const GlobalStyle = createGlobalStyle `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    background-color: ${props => props.theme.colors.background};
    font-family: ${props => props.theme.typography.fontFamily};
    color: ${props => props.theme.colors.text};
    transition: background-color 0.3s ease, color 0.3s ease;
  }
`;
const ThemeToggle = styled.button `
  position: fixed;
  top: 20px;
  right: 20px;
  background: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.background};
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  z-index: 1000;
  transition: transform 0.2s, opacity 0.2s;

  &:hover {
    opacity: 0.9;
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`;
export function CustomThemeProvider({ children }) {
    const [themePreset, setThemePreset] = useState('light');
    const toggleTheme = () => {
        setThemePreset(current => current === 'light' ? 'dark' : 'light');
    };
    const currentTheme = themes[themePreset];
    return (_jsxs(ThemeProvider, { theme: currentTheme, children: [_jsx(GlobalStyle, {}), _jsxs(ThemeToggle, { onClick: toggleTheme, children: ["Switch to ", themePreset === 'light' ? 'Dark' : 'Light', " Mode"] }), children] }));
}
