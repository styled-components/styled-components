---
'styled-components': patch
---

Fix a performance regression in 6.4.0 where dynamic `createGlobalStyle` components caused significant re-render slowdowns. Also restores pre-6.4 cascade ordering when multiple instances of the same `createGlobalStyle` coexist.
