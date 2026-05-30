---
'styled-components': patch
---

In React Native apps (both native and react-native-web), animating a multi-argument transform shorthand (`translate(x, y)`, `translate3d(x, y, z)`, or `scale(x, y)`) inside `@keyframes` or a `transition` no longer throws "Transform with key of translate must have an array as the value". These forms now animate correctly per axis. Single-axis forms and uniform `scale(n)` were already fine.
