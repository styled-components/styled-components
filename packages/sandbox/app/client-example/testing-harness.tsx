'use client';

import { useState } from 'react';
import styled, { css, keyframes } from 'styled-components';

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const Container = styled.div`
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
  animation: ${fadeIn} 0.3s ease-out;
`;

const Title = styled.h1`
  color: ${props => props.theme.colors.primary};
  font-size: 48px;
  margin-bottom: 24px;
  margin-top: 60px;
`;

const Subtitle = styled.p`
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.large};
  margin-bottom: ${props => props.theme.spacing.large};
  opacity: 0.8;
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
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.secondary};
  }
`;

const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid ${props => props.theme.colors.primary};
  border-radius: 6px;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.small};
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.secondary};
  }
`;

const TestArea = styled.div`
  background: ${props => props.theme.colors.background};
  border-radius: 12px;
  padding: 24px;
  border: 1px solid ${props => props.theme.colors.primary}20;
  margin-bottom: 20px;
`;

const TestCard = styled.div<{ $variant: 'default' | 'active' | 'disabled' | 'error' }>`
  ${props => {
    const baseStyles = css`
      border-radius: 8px;
      padding: ${props.theme.spacing.medium};
      margin-bottom: ${props.theme.spacing.medium};
      transition: all 0.2s;
      cursor: ${props.$variant === 'disabled' ? 'not-allowed' : 'pointer'};
      opacity: ${props.$variant === 'disabled' ? 0.5 : 1};
    `;

    const variantStyles = {
      default: css`
        background: ${props.theme.colors.background};
        border: 2px solid ${props.theme.colors.primary};
      `,
      active: css`
        background: ${props.theme.colors.primary};
        border: 2px solid ${props.theme.colors.primary};
        color: ${props.theme.colors.background};
      `,
      disabled: css`
        background: ${props.theme.colors.background};
        border: 2px solid ${props.theme.colors.secondary};
      `,
      error: css`
        background: ${props.theme.colors.accent || '#ff0000'};
        border: 2px solid ${props.theme.colors.accent || '#ff0000'};
        color: ${props.theme.colors.background};
      `,
    };

    return css`
      ${baseStyles}
      ${variantStyles[props.$variant]}
    `;
  }}

  &:hover {
    ${props => props.$variant !== 'disabled' && css`
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    `}
  }
`;

const TestText = styled.p<{ $customColor?: string }>`
  color: ${props => props.$customColor || props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.medium};
  line-height: 1.6;
  margin-bottom: 16px;
`;

const Badge = styled.span<{ $type: 'info' | 'success' | 'warning' }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  margin-left: 12px;
  
  ${props => {
    const styles = {
      info: css`
        background: ${props.theme.colors.secondary}40;
        color: ${props.theme.colors.secondary};
      `,
      success: css`
        background: #00c85340;
        color: #00c853;
      `,
      warning: css`
        background: ${props.theme.colors.accent}40;
        color: ${props.theme.colors.accent};
      `,
    };
    return styles[props.$type];
  }}
`;

export function ClientTestingHarness() {
  const [variant, setVariant] = useState<'default' | 'active' | 'disabled' | 'error'>('default');
  const [customColor, setCustomColor] = useState('#ff6b9d');

  return (
    <Container>
      <Title>
        Client Component Testing
        <Badge $type="warning">Interactive</Badge>
      </Title>

      <Subtitle>
        Full client-side interactivity with dynamic styling and state management
      </Subtitle>

      <ControlPanel>
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
          <ControlLabel>Custom Color</ControlLabel>
          <Input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)} />
        </ControlGroup>
      </ControlPanel>

      <TestArea>
        <h2 style={{ marginBottom: '24px' }}>Dynamic Components</h2>

        <TestCard $variant={variant}>
          <TestText>
            <strong>Variant Test Card ({variant})</strong>
            <br />
            This card demonstrates conditional styling based on the selected variant.
            The styles are computed dynamically on every state change.
          </TestText>
        </TestCard>

        <TestText $customColor={customColor}>
          <strong>Runtime Color Test</strong>
          <br />
          This text color updates in real-time as you adjust the color picker.
          Current value: <code>{customColor}</code>
        </TestText>

        <TestText>
          <strong>Theme-Based Styling</strong>
          <br />
          This text uses values from the theme context. Try switching between light and dark
          mode using the button in the top-right corner to see the theme update.
        </TestText>
      </TestArea>

      <TestArea>
        <h2 style={{ marginBottom: '16px' }}>
          React 19 + styled-components Features
          <Badge $type="success">New</Badge>
        </h2>
        <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>Automatic style deduplication and hoisting</li>
          <li>Client-side hydration with zero layout shift</li>
          <li>Transient props ($prop) prevent DOM attribute warnings</li>
          <li>CSS helper for composable style fragments</li>
          <li>Keyframe animations with automatic name generation</li>
          <li>TypeScript support with theme inference</li>
        </ul>
      </TestArea>
    </Container>
  );
}
