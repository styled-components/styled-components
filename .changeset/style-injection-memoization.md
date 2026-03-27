---
'styled-components': minor
---

Memoize style injection for dynamic components via shallow context comparison. Client-only — server renders are unaffected.

When a styled component re-renders with unchanged props and theme, the expensive `flatten` + `hash` + `generateName` pipeline is now skipped entirely via a `useRef`-based single-entry cache. A fast path for single-function interpolations also reduces cache-miss cost by avoiding `flatten`'s type dispatch and array allocation.

Benchmarks vs 6.3.12:

- **Parent state change cascading to styled children (the most common re-render pattern):** 3.3x faster for 50 children, 3.5x for 100
- **First mount of dynamic component trees:** +33% for individual components, +51% for sibling-heavy layouts
- **Prop changes cycling through many values (cache miss):** +39% for 50 children, +47% for 100
- No regressions on any benchmark
