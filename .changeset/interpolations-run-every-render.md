---
'styled-components': patch
---

Fixed a crash ("Rendered fewer hooks than expected") and a related stale-style bug for components that call a React hook, or read any value outside their props and theme, from inside a style interpolation. This affected `@mui/styled-engine-sc` with MUI X DataGrid, which calls a hook within an interpolation.

Style interpolations and `attrs` now run on every render, on the web and on React Native, so a hook called inside one runs consistently and a value read inside one always reflects its current state.
