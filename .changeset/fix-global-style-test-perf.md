---
"styled-components": patch
---

Fix test performance regression in 6.3.x by eliminating double style rendering in `createGlobalStyle` and removing unnecessary DOM queries during cleanup in client/test environments.
