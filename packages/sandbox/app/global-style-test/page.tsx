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
      <h2>Home</h2>
      <p style={{ lineHeight: 1.8 }}>
        This is the landing page for the <code>createGlobalStyle</code> test. The
        conditional body-lock toggle above lives in the shared layout, so it stays
        mounted when navigating to Page A or Page B.
      </p>
      <p style={{ lineHeight: 1.8, opacity: 0.7 }}>
        Try toggling the conditional style, then navigate between pages — the pink
        border and scroll lock should persist across route changes.
      </p>
    </div>
  );
}
