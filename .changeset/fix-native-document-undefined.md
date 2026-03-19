---
"styled-components": patch
---

Fix React Native crash caused by `document` references in the native build. The native bundle no longer includes DOM code, resolving compatibility with RN 0.79+ and Hermes.
