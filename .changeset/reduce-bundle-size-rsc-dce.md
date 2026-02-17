---
"styled-components": patch
---

Reduce standalone/browser bundle size by making IS_RSC a build-time constant, enabling dead code elimination of RSC-specific branches
