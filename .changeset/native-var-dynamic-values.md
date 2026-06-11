---
'styled-components': patch
---

React Native: a `var()` reference whose custom property holds a render-dependent value, such as `light-dark(...)`, a viewport unit, or `env(...)`, resolves against the live environment exactly as if the value had been written literally. This applies to inherited and self-declared custom properties, `var()` fallbacks, and `var()` inside `@media` and other conditional blocks, and the resolved value updates in place when the OS theme changes.
