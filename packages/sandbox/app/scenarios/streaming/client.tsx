'use client';

import styled, { createGlobalStyle } from 'styled-components';

/** The common shape: client components that first render inside late Suspense boundaries. */
export const LateWidgetOne = styled.div`
  padding: 8px;
  color: rgb(0, 0, 255);
`;

export const LateWidgetTwo = styled.div`
  padding: 8px;
  color: rgb(0, 128, 0);
`;

export const LateWidgetThree = styled.div`
  padding: 8px;
  color: rgb(128, 0, 128);
`;

/** First rendered by a late boundary, so it is a client global that arrives after a flush. */
export const LateClientGlobal = createGlobalStyle`
  [data-late-client-global] {
    outline: 2px solid rgb(128, 0, 128);
  }
`;
