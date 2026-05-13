---
'styled-components': patch
---

`background-size: cover` and `background-size: contain` on React Native no longer crash the app when applied to gradient backgrounds. Gradients now paint across the full element area as expected. `react-native-web` still receives the original keyword so the browser can handle it directly.

`background-position` values like `0 0`, `50% 50%`, and `top left` also no longer trigger a `react-native-web` warning.
