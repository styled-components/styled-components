---
'styled-components': patch
---

`background` shorthand now expands on React Native: a single declaration sets `background-image`, `background-position`, `background-size`, `background-repeat`, `background-attachment`, `background-origin`, `background-clip`, and `background-color` per CSS Backgrounds 3 §2.10. Multi-layer (comma-separated), position/size split by `/`, and color on the final layer all work. Native dev warnings fire for surfaces RN doesn't expose (`background-attachment: fixed`, non-default `background-origin` / `background-clip`); `react-native-web` honors the full shorthand through the browser.
