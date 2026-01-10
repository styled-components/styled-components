'use client';

import { useState } from 'react';
import styled, { createGlobalStyle, ThemeProvider } from 'styled-components';
import { themes, type ThemePreset, type Theme } from '../lib/test-themes';

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

const ControlPanel = styled.div`
  background: ${props => props.theme.colors.background};
  border: 2px solid ${props => props.theme.colors.primary};
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
`;

const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ControlLabel = styled.label`
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.small};
  font-weight: 600;
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid ${props => props.theme.colors.primary};
  border-radius: 6px;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.small};
  cursor: pointer;
`;

const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid ${props => props.theme.colors.primary};
  border-radius: 6px;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.small};
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.small};
  cursor: pointer;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
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

export default function ClientExamplePage() {
  const [themePreset, setThemePreset] = useState<ThemePreset>('light');
  const [globalStyleEnabled, setGlobalStyleEnabled] = useState(true);
  const [variant, setVariant] = useState<'default' | 'active' | 'disabled' | 'error'>('default');
  const [customColor, setCustomColor] = useState('#333333');

  const currentTheme = themes[themePreset];

  return (
    <ThemeProvider theme={currentTheme}>
      {globalStyleEnabled && <GlobalStyle />}
      <Container>
        <Title>Client Component Dynamic Testing Harness</Title>

        <ControlPanel>
          <ControlGroup>
            <ControlLabel>Theme Preset</ControlLabel>
            <Select value={themePreset} onChange={e => setThemePreset(e.target.value as ThemePreset)}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </Select>
          </ControlGroup>

          <ControlGroup>
            <CheckboxLabel>
              <Checkbox type="checkbox" checked={globalStyleEnabled} onChange={e => setGlobalStyleEnabled(e.target.checked)} />
              Enable Global Style
            </CheckboxLabel>
          </ControlGroup>

          <ControlGroup>
            <ControlLabel>Component Variant</ControlLabel>
            <Select value={variant} onChange={e => setVariant(e.target.value as typeof variant)}>
              <option value="default">Default</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="error">Error</option>
            </Select>
          </ControlGroup>

          <ControlGroup>
            <ControlLabel>Runtime Color</ControlLabel>
            <Input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)} />
          </ControlGroup>
        </ControlPanel>

        <TestArea>
          <Title>Test Components</Title>

          <TestCard $variant={variant}>
            <TestText>
              This card demonstrates conditional styling based on variant ({variant}).
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
