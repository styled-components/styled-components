---
'styled-components': patch
---

`createGlobalStyle` interpolations run during render, the same as interpolations on a styled component. They can call hooks such as `useContext`, `useState`, `useSyncExternalStore`, and `use`, and the global style follows what those hooks return without a prop or theme change.

A function inside a style object counts too, as in `` ${{ body: { color: p => p.theme.fg } }} ``, and follows the theme and any hook it calls.

A parent re-render with equal props skips the interpolations. A render on a server with no `ServerStyleSheet` also skips them, since nothing collects the result. In a server component, an interpolation can call only the hooks React offers there.
