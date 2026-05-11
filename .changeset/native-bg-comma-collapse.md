---
'styled-components': patch
---

Fixed `background-position`, `background-size`, and `background-repeat` declarations rejected by `react-native-web` when authored as a comma-separated list with the same value on every layer (e.g. `background-position: 0% 0%, 0% 0%`). The CSS shorthand already cycles a single value to all layers, so the redundant comma form now collapses at the boundary and reaches `react-native-web` as a single value while keeping multi-layer intent intact when the values actually differ.
