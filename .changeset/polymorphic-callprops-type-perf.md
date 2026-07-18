---
"styled-components": patch
---

Reduce TypeScript type-checking cost for styled components, most noticeably `styled(Component)` wrappers and polymorphic `as` usage. Large codebases that saw elevated `tsc` memory and type-instantiation counts get lower type-check memory and time, with no change to the emitted types or runtime behavior.
