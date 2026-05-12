---
'styled-components': patch
---

`rem` length values now resolve on React Native. The value multiplies against the inherited root font size (16 by default) at render time, so `width: 1rem` is `16` and `width: 2rem` is `32`. Works standalone and inside `calc()`. `react-native-web` defers to the browser's native handling.
