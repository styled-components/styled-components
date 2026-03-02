export default function PageA() {
  return (
    <div
      style={{
        background: 'rgba(233, 69, 96, 0.1)',
        borderRadius: '12px',
        padding: '32px',
        border: '1px solid rgba(233, 69, 96, 0.3)',
      }}
    >
      <h2>Page A</h2>
      <p style={{ lineHeight: 1.8 }}>
        You navigated here via client-side routing. The dark gradient background
        and serif font from the layout's <code>createGlobalStyle</code> should
        still be active.
      </p>
      <p style={{ lineHeight: 1.8, opacity: 0.7 }}>
        If you see a plain white background or sans-serif font, the layout's
        global style was incorrectly removed during navigation.
      </p>
    </div>
  );
}
