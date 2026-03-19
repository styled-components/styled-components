declare let __webpack_nonce__: string;

/**
 * Resolve a CSP nonce from available sources (in priority order):
 * 1. <meta property="csp-nonce"> (Vite puts nonce in the `nonce` attr)
 * 2. <meta name="sc-nonce"> (SC convention, nonce in `content` attr)
 * 3. __webpack_nonce__ global (legacy)
 *
 * For Next.js/Remix, pass nonces explicitly via StyleSheetManager or
 * ServerStyleSheet instead—auto-detection doesn't apply to header-based nonces.
 */
let cached: string | undefined | false = false;

/** @internal Reset the nonce cache (for testing only). */
export function resetNonceCache() {
  cached = false;
}

export default function getNonce(): string | undefined {
  if (cached !== false) return cached;

  if (typeof document !== 'undefined') {
    // Vite sets the nonce in the `nonce` attribute. Browsers expose this via
    // the .nonce DOM property but return "" from getAttribute('nonce').
    const viteMeta = document.head.querySelector<HTMLMetaElement>('meta[property="csp-nonce"]');
    if (viteMeta) return (cached = viteMeta.nonce || viteMeta.getAttribute('content') || undefined);

    const scMeta = document.head.querySelector<HTMLMetaElement>('meta[name="sc-nonce"]');
    if (scMeta) return (cached = scMeta.getAttribute('content') || undefined);
  }

  return (cached = typeof __webpack_nonce__ !== 'undefined' ? __webpack_nonce__ : undefined);
}
