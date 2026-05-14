---
"styled-components": patch
---

Fix a TypeScript error when wrapping a component whose props include an `as` prop with a non-string type (such as Next.js `Link`'s `as?: Url`). The styled-components `as` and `forwardedAs` props now consistently override the wrapped component's same-named props instead of colliding with them.
