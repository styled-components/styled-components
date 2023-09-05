import RootStyleRegistry from '../lib/registry';

export const revalidate = 0;

export default function AppLayout({ children }) {
  return (
    <html>
      <head>
        <title>RSC</title>
      </head>
      <body>
        <RootStyleRegistry>{children}</RootStyleRegistry>
      </body>
    </html>
  );
}
