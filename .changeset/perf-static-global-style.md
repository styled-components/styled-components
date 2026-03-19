---
"styled-components": patch
---

Skip unnecessary effect re-runs for static `createGlobalStyle` components. Static global styles now only inject once and clean up on unmount, instead of re-running the effect on every render.
