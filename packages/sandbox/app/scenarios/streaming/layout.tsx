import type { ReactNode } from 'react';
import { createGlobalStyle } from 'styled-components';

/** The common shape: a server global in the layout, rendered in the shell. */
const LayoutGlobal = createGlobalStyle`
  [data-streaming-page] {
    font-family: system-ui, sans-serif;
  }
`;

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <LayoutGlobal />
      {children}
    </>
  );
}
