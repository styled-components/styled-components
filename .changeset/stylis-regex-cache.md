---
"styled-components": patch
---

Cache compiled RegExp patterns for selector matching in stylis integration. Eliminates redundant regex compilation on repeated stringifyRules calls, reducing overhead for apps with many styled components.
