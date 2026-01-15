---
"styled-components": minor
---

Simplified internal architecture by eliminating the numeric group ID system.

- Removed `GroupIDAllocator` module - styles are now tracked directly by component ID
- Replaced `Uint32Array`-based `GroupedTag` with simpler `Map`-based storage
- Simplified SSR output format (no longer includes numeric group indices)
- Inlined `@emotion/unitless` dependency
- Removed unused `shallowequal` dependency
- Removed legacy Symbol polyfill check

Bundle size reduced by ~280 bytes gzipped (2.3% reduction).
