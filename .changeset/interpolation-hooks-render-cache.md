---
"styled-components": patch
---

Fixed a crash ("Rendered fewer hooks than expected") and a related stale-style bug for components that call a React hook, or read any value outside their props and theme, from inside a style interpolation. This affected `@mui/styled-engine-sc` with MUI X DataGrid, which calls hooks within an interpolation, and was a regression introduced in 6.4.0.

Style interpolations now run on every render, so a hook called inside one runs consistently and a value read inside one always reflects its current state.

If a component re-renders often with unchanged props and its interpolations are expensive, wrap it in `React.memo` to skip those re-renders. That is the right place to bail out, because only the calling code knows the full set of inputs its styles depend on.
