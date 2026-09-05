---
"styled-components": patch
---

Fixed a crash ("Rendered fewer hooks than expected") and a related stale-style bug for components that call a React hook, or read any value outside their props and theme, from inside a style interpolation. This affected `@mui/styled-engine-sc` with MUI X DataGrid, which calls hooks within an interpolation, and was a regression introduced in 6.4.0.

The render optimization added in 6.4.0 reused a cached result on a re-render with unchanged props, which skipped evaluating the interpolation. An interpolation runs as part of the component's own render, so skipping it dropped any hook it called (breaking React's rules of hooks) and served a stale class name when the interpolation depended on something other than props (a context value, a ref, module state). Interpolations now run on every render, and the class name always reflects their current output.

Re-renders with unchanged props therefore re-evaluate interpolations again. If a component re-renders often with the same props and its styles are expensive to compute, wrap it in `React.memo` to skip the re-render entirely, which is the sound place to bail out because only the calling code knows the full set of inputs its styles depend on.
