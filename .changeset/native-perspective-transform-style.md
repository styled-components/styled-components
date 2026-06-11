---
'styled-components': patch
---

React Native: `perspective` is supported as a standalone property, so it can combine with child transforms like `rotateY` or `rotateX` to create depth. Very small values are clamped to `1px` to match browser behavior. `transform-style: preserve-3d` is not supported on iOS or Android and drops with a development warning. On react-native-web the browser handles both properties.
