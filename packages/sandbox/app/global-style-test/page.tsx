import { createGlobalStyle } from 'styled-components';
import ToggleClient from './toggle-client';

/**
 * Conditional global style — should be removed from <head> when unmounted.
 */
const BodyLockStyles = createGlobalStyle`
  body {
    overflow: hidden !important;
    outline: 6px solid #e94560 !important;
    outline-offset: -6px;
  }
`;

export default function GlobalStyleTestPage() {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '12px',
        padding: '32px',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <h2>Conditional Unmount</h2>
      <p style={{ lineHeight: 1.8, marginBottom: '16px' }}>
        Toggle to mount/unmount a <code>createGlobalStyle</code> that adds a
        thick pink border to the viewport and locks scrolling. The{' '}
        <code>&lt;style&gt;</code> tag should appear in <code>&lt;head&gt;</code>{' '}
        when mounted and disappear when unmounted.
      </p>
      <ToggleClient>
        <BodyLockStyles />
      </ToggleClient>
    </div>
  );
}
