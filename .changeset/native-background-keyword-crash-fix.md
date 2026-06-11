---
'styled-components': patch
---

`background-size: cover` and `background-size: contain` are supported on React Native for gradient backgrounds: the gradient paints across the full element area. On react-native-web the browser handles the keyword directly.

`background-position` values like `0 0`, `50% 50%`, and `top left` are supported on react-native-web without a warning.
