---
'styled-components': patch
---

`perspective` as a standalone property now applies on React Native by lowering to a `perspective()` transform on the element; combine with a child 3D transform (`rotateY`, `rotateX`) to see the depth effect. Lengths under 1px clamp to 1px per the spec. `transform-style: preserve-3d` warns once on iOS / Android (no platform API in RN 0.85); `react-native-web` honors both natively.
