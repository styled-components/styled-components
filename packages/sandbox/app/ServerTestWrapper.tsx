'use client';

import { useState } from 'react';
import styled, { createGlobalStyle, ThemeProvider } from 'styled-components';
import { themes, type ThemePreset, type Theme } from './lib/test-themes';
import { ServerTestControls } from './ServerTestControls';

type ThemeType = Theme;

declare module 'styled-components' {
  export interface DefaultTheme extends ThemeType {}
}

const GlobalStyle = createGlobalStyle`
  body {
    background-color: ${props => props.theme.colors.background};
    font-family: ${props => props.theme.typography.fontFamily};
    color: ${props => props.theme.colors.text};
  }
`;

const Container = styled.div`
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Title = styled.h1`
  color: ${props => props.theme.colors.primary};
  font-size: ${props => props.theme.typography.fontSize.large};
  margin-bottom: 24px;
`;

const TestArea = styled.div`
  background: ${props => props.theme.colors.background};
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
`;

const TestCard = styled.div<{ $variant: 'default' | 'active' | 'disabled' | 'error' }>`
  background: ${props => {
    if (props.$variant === 'error') return props.theme.colors.accent || '#ff0000';
    if (props.$variant === 'active') return props.theme.colors.primary;
    return props.theme.colors.background;
  }};
  border: 2px solid ${props => {
    if (props.$variant === 'disabled') return props.theme.colors.secondary;
    return props.theme.colors.primary;
  }};
  border-radius: 8px;
  padding: ${props => props.theme.spacing.medium};
  margin-bottom: ${props => props.theme.spacing.medium};
  opacity: ${props => props.$variant === 'disabled' ? 0.5 : 1};
  cursor: ${props => props.$variant === 'disabled' ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
`;

const TestText = styled.p<{ $customColor?: string }>`
  color: ${props => props.$customColor || props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.medium};
  line-height: 1.6;
  margin-bottom: 16px;
`;

export function ServerTestWrapper() {
  const [themePreset, setThemePreset] = useState<ThemePreset>('light');
  const [globalStyleEnabled, setGlobalStyleEnabled] = useState(true);
  const [variant, setVariant] = useState<'default' | 'active' | 'disabled' | 'error'>('default');
  const [customColor, setCustomColor] = useState('#333333');

  const currentTheme = themes[themePreset];

  return (
    <ThemeProvider theme={currentTheme}>
      {globalStyleEnabled && <GlobalStyle />}
      <Container>
        <Title>Server Component Dynamic Testing Harness</Title>

        <ServerTestControls
          onThemeChange={setThemePreset}
          onVariantChange={setVariant}
          onColorChange={setCustomColor}
          onGlobalStyleChange={setGlobalStyleEnabled}
          currentTheme={themePreset}
          currentVariant={variant}
          currentColor={customColor}
          currentGlobalStyleEnabled={globalStyleEnabled}
        />

        <TestArea>
          <Title>Test Components (RSC-Compatible Pattern)</Title>

          <TestCard $variant={variant}>
            <TestText>
              This card demonstrates conditional styling based on variant ({variant}).
              These styled-components are rendered in a client component but demonstrate RSC-compatible
              prop-based styling patterns.
            </TestText>
          </TestCard>

          <TestText $customColor={customColor}>
            This text demonstrates runtime CSS updates. Color: {customColor}
          </TestText>

          <TestText>
            This text uses theme values and will update when you change the theme preset.
          </TestText>
        </TestArea>
      </Container>
    </ThemeProvider>
  );
}
