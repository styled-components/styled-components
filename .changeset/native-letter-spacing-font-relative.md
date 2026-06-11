---
'styled-components': patch
---

React Native: `letter-spacing` accepts the full CSS length grammar. Absolute lengths (`pt`, `pc`, `in`, `cm`, `mm`, `Q`) fold to dp at compile time. Font-relative units (`em`, `rem`, `lh`, `rlh` plus the font-metric forms `ex`, `cap`, `ch`, `ic` and their `r`-variants), viewport units, and container-query units resolve at render time against the current environment. Numbers, `px`, and `normal` are supported. Unsupported units drop with a development warning.
