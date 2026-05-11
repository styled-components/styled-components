import type { ReactNode } from 'react';
import { StyleSheetManager } from 'styled-components';
import { rscPlugin } from 'styled-components/plugins';

export default function RSCLayout({ children }: { children: ReactNode }) {
  return <StyleSheetManager plugins={[rscPlugin]}>{children}</StyleSheetManager>;
}
