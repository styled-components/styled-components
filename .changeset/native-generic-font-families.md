---
'styled-components': patch
---

Generic `font-family` keywords such as `serif`, `sans-serif`, `monospace`, `system-ui`, `ui-rounded`, `emoji`, and `math` now map to an appropriate platform font on iOS and Android. `react-native-web` still passes the keyword to the browser. When a React Native font list contains multiple comma-separated families, styled-components uses the first one and shows a one-time development warning because React Native accepts only one font family.
