---
'styled-components': patch
---

React Native: the `rem` length unit is supported. It uses the app's root font size, `16` by default, so `width: 1rem` becomes `16` and `width: 2rem` becomes `32`. `rem` is supported on its own and inside `calc()`. On react-native-web the browser handles it.
