---
"styled-components": patch
---

Gracefully handle CSS syntax errors in React Native instead of crashing. Missing semicolons and other syntax issues now log a warning in development and produce an empty style object instead of throwing a fatal error.
