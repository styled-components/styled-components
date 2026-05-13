---
'styled-components': patch
---

`rem` length values now work on React Native. They use the app's root font size, `16` by default, so `width: 1rem` becomes `16` and `width: 2rem` becomes `32`. `rem` works on its own and inside `calc()`. `react-native-web` continues to let the browser handle it.
