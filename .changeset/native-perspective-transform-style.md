---
'styled-components': patch
---

`perspective` now works as a standalone property on React Native, so it can be combined with child transforms like `rotateY` or `rotateX` to create depth. Very small values are clamped to `1px` to match browser behavior. `transform-style: preserve-3d` shows a one-time development warning on iOS and Android because React Native does not expose that behavior yet; `react-native-web` continues to let the browser handle both properties.
