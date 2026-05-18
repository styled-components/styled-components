---
'styled-components': patch
---

React Native: `lab()` and `lch()` now produce correct colors when channels are written as percentages. `lab(50% 0 0)` resolves to mid-gray as expected, where it previously produced near-black. Per CSS Color L4, each space has its own range:

- `lab` L: 0%-100% maps to 0-100. a/b: 100% maps to ±125.
- `lch` L: 0%-100% maps to 0-100. C: 100% maps to 0-150.
- `oklab` L: 0%-100% maps to 0-1. a/b: 100% maps to ±0.4.
- `oklch` L: 0%-100% maps to 0-1. C: 100% maps to 0-0.4.

Web is unaffected (browsers parse these notations natively).
