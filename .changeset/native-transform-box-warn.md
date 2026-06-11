---
'styled-components': patch
---

React Native: `transform-box` shows a development warning on iOS and Android explaining that React Native transforms use the view center as their reference box. Use `transform-origin` when you need to move the pivot point. On react-native-web the browser handles `transform-box`.
