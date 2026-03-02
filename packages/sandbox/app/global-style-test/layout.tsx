import { createGlobalStyle } from 'styled-components';
import NavClient from './nav-client';

/**
 * Persistent global style living in a shared layout.
 * Should remain applied while navigating between child routes.
 */
const LayoutGlobalStyle = createGlobalStyle`
  body {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%) !important;
    color: #eee !important;
    min-height: 100vh;
    font-family: Georgia, 'Times New Roman', serif !important;
  }

  a { color: #e94560; }
  ::selection { background: #e94560; color: #fff; }
`;

export default function GlobalStyleTestLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LayoutGlobalStyle />
      <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '8px', color: '#e94560' }}>
          createGlobalStyle Tests (#5649)
        </h1>
        <p style={{ marginBottom: '24px', opacity: 0.7 }}>
          The dark gradient background and serif font come from a{' '}
          <code>createGlobalStyle</code> in this shared layout. Navigate between
          pages — the style should remain applied throughout.
        </p>
        <NavClient />
        {children}
      </div>
    </>
  );
}
