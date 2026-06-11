---
'styled-components': patch
---

On react-native-web, parallel animations that use additive composition (`add` or `accumulate`) pass `animation-composition` through to the browser so layered effects compose per CSS Animations Level 2. When every effect uses the default `replace` composition, the cascade is unchanged.
