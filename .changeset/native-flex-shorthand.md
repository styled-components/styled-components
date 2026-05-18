---
'styled-components': patch
---

Fixes React Native spec-compliance edge cases in the `flex` shorthand. `flex: initial` and a zero basis after grow and shrink factors now match CSS behavior, while invalid negative grow, shrink, and basis values are ignored.
