import type { ReactNode } from 'react';
import { StyleSheetManager, stylisPluginRSC } from 'styled-components';

export default function RSCLayout({ children }: { children: ReactNode }) {
  return (
    <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
      {children}
    </StyleSheetManager>
  );
}
