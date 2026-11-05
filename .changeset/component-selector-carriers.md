---
'styled-components': patch
---

Referring to another component in a style (`${Box}:hover { ... }`) produces that component's selector in two more cases: a `React.memo` wrapper with the styled component's statics hoisted onto it, and any styled component under Preact's `react-compat`. The first used to write the wrapper's fields out as CSS declarations, and the second produced broken CSS or threw during render.
