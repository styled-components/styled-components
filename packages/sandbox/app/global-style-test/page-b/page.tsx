export default function PageB() {
  return (
    <div
      style={{
        background: 'rgba(15, 52, 96, 0.3)',
        borderRadius: '12px',
        padding: '32px',
        border: '1px solid rgba(255,255,255,0.15)',
      }}
    >
      <h2>Page B</h2>
      <p style={{ lineHeight: 1.8 }}>
        Another route under the same layout. The dark gradient and serif font
        should still be visible — try navigating rapidly between all three tabs.
      </p>
      <p style={{ lineHeight: 1.8, opacity: 0.7 }}>
        The layout's <code>createGlobalStyle</code> stays mounted because
        Next.js preserves layouts across child route navigations.
      </p>
    </div>
  );
}
