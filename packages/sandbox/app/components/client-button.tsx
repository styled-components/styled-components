'use client';

import styled from 'styled-components';

/**
 * A client-side styled button used as a base component.
 * RSC pages can extend this with styled(ClientButton)`...`
 * to test cross-boundary style specificity (#5672).
 */
const ClientButton = styled.button`
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  border: 2px solid #0070f3;
  border-radius: 8px;
  background: #0070f3;
  color: white;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: #0051a8;
    border-color: #0051a8;
  }
`;

export default ClientButton;
