---
'styled-components': patch
---

React Native: `lab()` and `lch()` accept percentage channels and resolve to the correct color. `lab(50% 0 0)` is mid-gray. Per CSS Color L4, each space has its own range:

- `lab` L: 0%-100% maps to 0-100. a/b: 100% maps to ±125.
- `lch` L: 0%-100% maps to 0-100. C: 100% maps to 0-150.
- `oklab` L: 0%-100% maps to 0-1. a/b: 100% maps to ±0.4.
- `oklch` L: 0%-100% maps to 0-1. C: 100% maps to 0-0.4.

The web is unaffected (the browser parses these notations natively).
