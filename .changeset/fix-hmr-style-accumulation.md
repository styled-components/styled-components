---
"styled-components": patch
---

Fix HMR style tag accumulation in RSC mode. Style tags omit `precedence` and `href` in development so React treats them as regular elements that unmount on re-render, preventing stale tags from persisting.
