---
'styled-components': patch
---

A component keeps its other styles when an interpolation holds one of these values:

- A function declaring two or more parameters, such as `(props, unused) => props.color`. It is called with the render context.
- An array, directly or returned by a function. Its items are joined as text.
- `true`, directly or returned by a function. It adds nothing.
- An object with its own `toString`, such as a class instance or a `Date`, or a `bigint`, directly or returned by a function. It reads as its text.
