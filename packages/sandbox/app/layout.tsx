import type { Metadata, Viewport } from 'next';
import StyledComponentsRegistry from './lib/registry';

export const metadata: Metadata = {
  title: 'styled-components RSC Test',
  description: 'Testing styled-components with React Server Components and Next.js 16',
  generator: 'Next.js',
  applicationName: 'styled-components Sandbox',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
      </body>
    </html>
  );
}
