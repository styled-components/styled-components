---
'styled-components': major
---

Mounting the same static `createGlobalStyle` component multiple times emits its CSS only once. A component whose rules contain a function emits once per mounted instance.

Rendering output stays byte-stable across SSR, client, and Server Components when the calls run in the same order on each side. Function-bodied ids follow that order, so a different order swaps which rules land in which group.
