import React from 'react';
import styled from 'styled-components';

const StyledButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`;

console.log('[DEBUG ServerButton module] IS_RSC:', typeof React.createContext === 'undefined');

export default function ServerButton({ children }: { children?: React.ReactNode }) {
  return <StyledButton>{children as React.ReactNode}</StyledButton>;
}
