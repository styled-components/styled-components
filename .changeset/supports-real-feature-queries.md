---
'styled-components': major
---

React Native: `@supports` conditions are evaluated as real feature queries. A condition like `@supports (display: grid)` answers based on what the current platform can actually render, `not` / `and` / `or` combinations follow the CSS grammar (invalid mixes are ignored as the spec requires), unknown future syntax such as `selector(...)` evaluates to false, and on the web the browser answers directly. Probing for an unsupported feature inside `@supports` is silent: the query is the supported way to ask, so it does not emit the development warning for that feature.
