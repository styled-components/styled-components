---
'styled-components': patch
---

Fix `withTheme` HOC types: ref now correctly resolves to the component instance type instead of the constructor, and `theme` is properly optional in the wrapped component's props.
