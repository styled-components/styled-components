'use client';

import Link from 'next/link';
import styled from 'styled-components';

export default function BackLink() {
  return <StyledBackLink href="/">&larr; All tests</StyledBackLink>;
}

const StyledBackLink = styled(Link)`
  display: inline-block;
  color: ${p => p.theme.colors.text};
  opacity: 0.5;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  margin-bottom: 24px;

  &:hover {
    opacity: 1;
    color: ${p => p.theme.colors.primary};
  }
`;
