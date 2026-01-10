import type { Metadata } from 'next';
import StyledComponentsRegistry from './lib/registry';

export const metadata: Metadata = {
  title: 'styled-components RSC Test',
  description: 'Testing styled-components with React Server Components',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
      </body>
    </html>
  );
}
