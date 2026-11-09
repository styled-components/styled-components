import styled, { createGlobalStyle } from 'styled-components';

/** B holds the first appearance of layer `b` and is defined before A, which holds layer `a`. */
export const B = styled.div`
  @layer b {
    color: blue;
  }
`;

export const A = styled.div`
  @layer a {
    color: red;
  }
`;

/** States the layer order up front, so no later move can change it. */
export const LayerOrder = createGlobalStyle`
  @layer a, b;
`;
