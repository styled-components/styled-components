---
'styled-components': patch
---

Fix `createGlobalStyle` styles not being removed when unmounted in RSC environments. React 19's `precedence` attribute on style tags makes them persist as permanent resources; global styles now render without `precedence` so they follow normal component lifecycle.
