---
'styled-components': patch
---

Referring to another component in a style (`${Box}:hover { ... }`) produces that component's selector for any styled component under `preact/compat`, and for a `React.memo` or function wrapper that has the styled component's statics hoisted onto it.
