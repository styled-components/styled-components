---
"styled-components": major
---

Mounting the same `createGlobalStyle` component multiple times now emits its CSS only once. Previously each mount produced its own copy of the stylesheet rules. Rendering output stays byte-stable across SSR, client, and Server Components.
