---
'styled-components': patch
---

Server rendering on the edge runtime is not supported. On a route with `export const runtime = 'edge'`, a server component using styled-components fails `next build`, and a client component rendered through a `ServerStyleSheet` registry fails on the request, each with an error naming the fix: remove that line, or set it to `'nodejs'`, on every route that renders styled-components on the server.
