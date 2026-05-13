---
'styled-components': patch
---

`transform-box` now shows a one-time development warning on iOS and Android explaining that React Native transforms use the view center as their reference box. Use `transform-origin` when you need to move the pivot point. `react-native-web` continues to let the browser handle `transform-box`.
