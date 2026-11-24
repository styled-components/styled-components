---
'styled-components': patch
---

A `styled-components/native` component will no longer cause TypeScript to show an error of TS2590 ("Expression produces a union type that is too complex to represent") on a Reanimated `useAnimatedRef` ref, which it did from 6.5.3. However, if a DOM element or web styled component is checked earlier in the code then this error can still show, like a normal `<div>` would without styled-components.
