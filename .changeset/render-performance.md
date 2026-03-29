---
'styled-components': minor
---

Significant render performance improvements via three-layer memoization and hot-path micro-optimizations. Client-only; server renders are unaffected.

Re-renders that don't change styling now skip style resolution entirely. Components sharing the same CSS (e.g., list items) benefit from cross-sibling caching. Hot-path changes include `forEach` → `for`/`for...of`, template literal → manual concat, and reduced allocations.

Benchmarks vs 6.3.12:

- **Parent re-render (most common):** 3.3x faster
- **First mount:** 1.7-2.5x faster
- **Prop cycling:** 2.3-2.4x faster
- **10K heavy layouts:** 1.9x faster
- No regressions on any benchmark
