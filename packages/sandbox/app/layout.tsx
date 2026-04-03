import type { Metadata, Viewport } from 'next';
import styled from 'styled-components';
import StyledComponentsRegistry from './lib/registry';
import { CustomThemeProvider } from './components/theme-provider';
import { Sidebar } from './components/sidebar';
import theme from './lib/theme';

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
    { media: '(prefers-color-scheme: dark)', color: '#111827' },
  ],
};

const themeScript = `(function(){try{var d=document.documentElement,s=localStorage.getItem('theme');if(s==='dark'||s==='light'){d.classList.add(s)}else if(window.matchMedia('(prefers-color-scheme:dark)').matches){d.classList.add('dark')}}catch(e){}})();`;

const Content = styled.div`
  flex: 1;
  padding: ${theme.spacing.large};
  overflow-x: auto;
  min-width: 0;
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning>
        <StyledComponentsRegistry>
          <CustomThemeProvider>
            <Sidebar />
            <Content>{children}</Content>
          </CustomThemeProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
