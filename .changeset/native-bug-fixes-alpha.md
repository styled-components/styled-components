---
"styled-components": patch
---

React Native: passing `prop={undefined}` to a styled component opts out of an `attrs()`-provided default, matching web behavior. `<Comp accessible={undefined} />` renders with no `accessible` prop even when the component has `.attrs({ accessible: true })`.
