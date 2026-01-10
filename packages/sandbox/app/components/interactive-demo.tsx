'use client';

import { useState } from 'react';
import styled from 'styled-components';

const DemoContainer = styled.div`
  background: ${props => props.theme.colors.background};
  border: 2px solid ${props => props.theme.colors.primary};
  border-radius: 12px;
  padding: ${props => props.theme.spacing.large};
  margin-bottom: ${props => props.theme.spacing.medium};
`;

const Button = styled.button<{ $variant: 'primary' | 'secondary' }>`
  background: ${props => 
    props.$variant === 'primary' 
      ? props.theme.colors.primary 
      : props.theme.colors.secondary};
  color: ${props => props.theme.colors.background};
  border: none;
  border-radius: 8px;
  padding: ${props => props.theme.spacing.medium} ${props => props.theme.spacing.large};
  font-size: ${props => props.theme.typography.fontSize.medium};
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;

  &:hover {
    opacity: 0.9;
    transform: scale(1.02);
  }

  &:active {
    transform: scale(0.98);
  }
`;

const Counter = styled.div`
  font-size: ${props => props.theme.typography.fontSize.large};
  color: ${props => props.theme.colors.text};
  margin: ${props => props.theme.spacing.large} 0;
  text-align: center;
  font-weight: bold;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.medium};
  flex-wrap: wrap;
`;

export function InteractiveDemo() {
  const [count, setCount] = useState(0);

  return (
    <DemoContainer>
      <h3 style={{ margin: 0, marginBottom: '16px' }}>Interactive Client Component</h3>
      <Counter>Count: {count}</Counter>
      <ButtonGroup>
        <Button $variant="primary" onClick={() => setCount(c => c + 1)}>
          Increment
        </Button>
        <Button $variant="secondary" onClick={() => setCount(c => c - 1)}>
          Decrement
        </Button>
        <Button $variant="primary" onClick={() => setCount(0)}>
          Reset
        </Button>
      </ButtonGroup>
    </DemoContainer>
  );
}
