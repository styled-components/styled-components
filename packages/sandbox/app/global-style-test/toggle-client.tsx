'use client';

import React, { useState } from 'react';

export default function ToggleClient({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false);

  return (
    <div>
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
      {show && children}
      <p style={{ marginTop: '16px', opacity: 0.7 }}>
        <strong>Status:</strong> Conditional global style is{' '}
        <span style={{ color: show ? '#e94560' : '#2ecc71', fontWeight: 700 }}>
          {show ? 'MOUNTED' : 'UNMOUNTED'}
        </span>
        . Inspect <code>&lt;head&gt;</code> for the{' '}
        <code>data-styled-global</code> style tag.
      </p>
    </div>
  );
}
