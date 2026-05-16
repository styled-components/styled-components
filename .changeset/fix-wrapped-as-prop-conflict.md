---
"styled-components": patch
---

Fix a TypeScript error when wrapping a component whose props include an `as` prop with a non-string type (such as Next.js `Link`'s `as?: Url`). The styled component now accepts either the styled-components polymorphism value or the wrapped component's own `as` type, so spreading the wrapped component's props onto the styled component is assignable again.
