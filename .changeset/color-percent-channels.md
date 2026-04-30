---
"styled-components": patch
---

`lab()` and `lch()` now produce correct colors when channels are written as percentages.

`lab(50% 0 0)` correctly resolves to mid-gray. Previously it produced near-black because the polyfill scaled every percent by `1/100`, treating lab/lch the same as oklab/oklch. Per CSS Color L4 each space has its own range:

- `lab` L: 0%-100% maps to 0-100. a/b: 100% maps to ±125.
- `lch` L: 0%-100% maps to 0-100. C: 100% maps to 0-150.
- `oklab` L: 0%-100% maps to 0-1. a/b: 100% maps to ±0.4.
- `oklch` L: 0%-100% maps to 0-1. C: 100% maps to 0-0.4.

The fix only affects React Native, where these notations are polyfilled at build time before reaching RN's color parser. Web is unaffected (browsers parse these notations natively).
