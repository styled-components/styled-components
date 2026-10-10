---
'styled-components': patch
---

Server rendering on the edge runtime is not supported. A route with `export const runtime = 'edge'` that renders styled-components on the server reports an error naming the fix: remove that line, or set it to `'nodejs'`, on every such route. The error replaces unrelated messages such as `createContext is not a function` and `document is not defined`.
