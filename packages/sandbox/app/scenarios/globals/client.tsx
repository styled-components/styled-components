'use client';

import styled, { createGlobalStyle } from 'styled-components';

// The component is defined before the global, so definition order alone would put it first.
export const ClientTie = styled.div`
  color: blue;
`;

export const ClientGlobal = createGlobalStyle`
  .tie-cg-sc,
  .tie-cg-cc {
    color: red;
  }

  .tie-sg-cg {
    color: red;
  }
`;
