---
"styled-components": patch
---

Fix HMR style tag accumulation in RSC mode. Style tags now use stable hrefs in development so React 19 replaces them on hot reload instead of accumulating new permanent resource tags.
