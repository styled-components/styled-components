---
"styled-components": patch
---

Fixed createGlobalStyle performance regression in jsdom test environments where CSS rules accumulated without cleanup on each render/unmount cycle, causing O(n²) slowdown
