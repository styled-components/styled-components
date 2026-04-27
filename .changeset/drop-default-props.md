---
"styled-components": major
---

Styled components no longer honor `defaultProps`. React 19 removed `defaultProps` support from function components, so the library-level folding behavior (where a child styled component inherited a parent's `defaultProps`) no longer has any effect to build on.

Migration:

- For default prop values, use `.attrs()`. Object-form wins over props; use the function form `.attrs(p => ({ foo: p.foo ?? 'default' }))` when you want user-provided props to override the default.
- For a default theme, wrap your tree in `<ThemeProvider theme={...}>`.
