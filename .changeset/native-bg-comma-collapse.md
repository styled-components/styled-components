---
'styled-components': patch
---

Fixes React Native edge cases for layered backgrounds when every comma-separated layer repeats the same position, size, or repeat, including values produced by the `background` shorthand. Simple center combinations such as `center top` fold to a single keyword (`top`) without changing layout.
