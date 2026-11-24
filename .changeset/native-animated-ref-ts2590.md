---
'styled-components': patch
---

A `styled-components/native` component no longer triggers TS2590 ("Expression produces a union type that is too complex to represent") on a Reanimated `useAnimatedRef` ref. If a DOM element or web styled component is checked earlier in the same program, TypeScript can still report TS2590, as it does for a plain `<div>` without styled-components.
