---
'styled-components': patch
---

`letter-spacing` now accepts font-relative units on React Native. `letter-spacing: 0.05em`, `0.1rem`, and `0.1lh` resolve at render time against the cascaded font-size or line-height, matching other font-relative length properties. Numbers, `px`, and `normal` continue to work; truly unsupported units still drop with a development warning.
