---
'styled-components': patch
---

`letter-spacing` now accepts the full CSS length grammar on React Native. Absolute lengths (`pt`, `pc`, `in`, `cm`, `mm`, `Q`) fold to dp at compile time. Font-relative units (`em`, `rem`, `lh`, `rlh` plus the font-metric forms `ex`, `cap`, `ch`, `ic` and their `r`-variants), viewport units, and container-query units resolve at render time against the current environment. Numbers, `px`, and `normal` continue to work; truly unsupported units still drop with a development warning.
