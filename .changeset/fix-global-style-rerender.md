---
"styled-components": patch
---

Fix createGlobalStyle re-rendering causing styles to briefly disappear

Static global styles are now only injected once and skipped on re-renders, preventing issues with React 18/19 concurrent rendering where the brief removal and re-addition of styles could cause visual glitches or interfere with React 19's style hoisting behavior.

This fixes an issue where multiple global styles could appear missing during renders, especially in React 19 with Next.js App Router.
