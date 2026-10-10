---
'styled-components': patch
---

Server rendering on the edge runtime is not supported. A route with `export const runtime = 'edge'` that renders styled-components on the server reports an error naming the fix: remove that line, or set it to `'nodejs'`, on every such route. The message states the cause and the fix, so a failing build or request points straight at the runtime setting.
