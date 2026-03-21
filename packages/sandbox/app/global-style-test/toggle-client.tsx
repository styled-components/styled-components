'use client';

import React, { useState } from 'react';
import { createGlobalStyle } from 'styled-components';

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

export default function ToggleClient() {
  const [show, setShow] = useState(false);

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '12px',
        padding: '32px',
        border: '1px solid rgba(255,255,255,0.1)',
        marginBottom: '24px',
      }}
    >
      <h2>Conditional Unmount</h2>
      <p style={{ lineHeight: 1.8, marginBottom: '16px' }}>
        Toggle to mount/unmount a <code>createGlobalStyle</code> that adds a thick pink border to the
        viewport and locks scrolling. The <code>&lt;style&gt;</code> tag should appear in{' '}
        <code>&lt;head&gt;</code> when mounted and disappear when unmounted.
      </p>
      <button
        onClick={() => setShow(v => !v)}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          cursor: 'pointer',
          background: show ? '#e94560' : '#2a4a6b',
          color: '#fff',
          border: show ? '1px solid #e94560' : '1px solid #3a6a9b',
          borderRadius: '8px',
          marginBottom: '16px',
        }}
      >
        {show ? 'Remove conditional style' : 'Add conditional style'}
      </button>
      {show && <BodyLockStyles />}
      <p style={{ marginTop: '16px', opacity: 0.7 }}>
        <strong>Status:</strong> Conditional global style is{' '}
        <span style={{ color: show ? '#e94560' : '#2ecc71', fontWeight: 700 }}>
          {show ? 'MOUNTED' : 'UNMOUNTED'}
        </span>
        . Inspect <code>&lt;head&gt;</code> for the <code>data-styled-global</code> style tag.
      </p>
    </div>
  );
}
