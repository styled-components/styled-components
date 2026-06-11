---
'styled-components': patch
---

React Native: fixes spec-compliance edge cases in the `flex` shorthand. `flex: initial` and a zero basis after grow and shrink factors match CSS behavior, and invalid negative grow, shrink, and basis values are ignored.
