---
'styled-components': patch
---

Optimize internal style processing hot paths: cached GroupedTag index lookups, string fast path in flatten, direct string concatenation in dynamic style generation, pre-built stylis middleware chain with lazy RegExp creation, single-lookup Map operations, VirtualTag append fast-path, and manual string concat in SSR output.
