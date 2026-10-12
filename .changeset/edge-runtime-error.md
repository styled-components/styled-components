---
"styled-components": patch
---

Rendering styled-components on the server with the edge runtime (for example `export const runtime = 'edge'` in a Next.js route) now fails with a clear message that names the fix: use the Node.js runtime for routes that render styled-components. Previously the same setup ended in an obscure crash, either at `next build` or on the first request.
