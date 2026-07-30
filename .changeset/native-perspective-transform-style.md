---
'styled-components': patch
---

React Native: `perspective` is supported as a standalone property, so it can combine with child transforms like `rotateY` or `rotateX` to create depth. Very small values are clamped to `1px` to match browser behavior.

`translate: x y z` keeps its Z value on React Native, and the three-argument `translate(x, y, z)` transform function is supported on iOS and Android.

`transform-style: preserve-3d` is isolated automatically for animated 3D transforms. A static declaration has no effect on iOS without a perspective surface and drops with a development warning. On react-native-web the browser handles all of these properties.
