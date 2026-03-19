---
"styled-components": minor
---

Add first-class CSP nonce support. Nonces can now be configured via `StyleSheetManager`'s `nonce` prop (recommended for Next.js, Remix), `ServerStyleSheet`'s constructor, `<meta property="csp-nonce">` (Vite convention), `<meta name="sc-nonce">`, or the legacy `__webpack_nonce__` global.
