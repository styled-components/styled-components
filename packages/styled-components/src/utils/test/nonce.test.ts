import getNonce, { resetNonceCache } from '../nonce';

declare let __webpack_nonce__: string | undefined;

const cleanupMeta = () =>
  document.head
    .querySelectorAll('meta[property="csp-nonce"], meta[name="sc-nonce"]')
    .forEach(el => el.remove());

describe('getNonce', () => {
  let originalWebpackNonce: string | undefined;

  beforeEach(() => {
    originalWebpackNonce = typeof __webpack_nonce__ !== 'undefined' ? __webpack_nonce__ : undefined;
    // @ts-expect-error clearing global
    delete (globalThis as any).__webpack_nonce__;
    cleanupMeta();
    resetNonceCache();
  });

  afterEach(() => {
    if (originalWebpackNonce !== undefined) {
      (globalThis as any).__webpack_nonce__ = originalWebpackNonce;
    }
    cleanupMeta();
  });

  it('should return undefined when no nonce source is available', () => {
    expect(getNonce()).toBeUndefined();
  });

  it('should detect nonce from <meta property="csp-nonce">', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('property', 'csp-nonce');
    meta.setAttribute('content', 'vite-nonce-123');
    document.head.appendChild(meta);

    expect(getNonce()).toBe('vite-nonce-123');
  });

  it('should detect nonce from <meta name="sc-nonce">', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'sc-nonce');
    meta.setAttribute('content', 'sc-nonce-456');
    document.head.appendChild(meta);

    expect(getNonce()).toBe('sc-nonce-456');
  });

  it('should prefer Vite meta over SC meta', () => {
    const viteMeta = document.createElement('meta');
    viteMeta.setAttribute('property', 'csp-nonce');
    viteMeta.setAttribute('content', 'vite-wins');
    document.head.appendChild(viteMeta);

    const scMeta = document.createElement('meta');
    scMeta.setAttribute('name', 'sc-nonce');
    scMeta.setAttribute('content', 'sc-loses');
    document.head.appendChild(scMeta);

    expect(getNonce()).toBe('vite-wins');
  });

  it('should prefer meta tags over __webpack_nonce__', () => {
    (globalThis as any).__webpack_nonce__ = 'webpack-loses';

    const meta = document.createElement('meta');
    meta.setAttribute('name', 'sc-nonce');
    meta.setAttribute('content', 'meta-wins');
    document.head.appendChild(meta);

    expect(getNonce()).toBe('meta-wins');
  });

  it('should fall back to __webpack_nonce__', () => {
    (globalThis as any).__webpack_nonce__ = 'webpack-fallback';

    expect(getNonce()).toBe('webpack-fallback');
  });
});
