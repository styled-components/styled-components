---
'styled-components': patch
---

`transform-box` now emits a one-time dev warning on iOS / Android explaining that React Native's transform pivot is fixed at the view center; use `transform-origin` to shift it. The declaration drops on native; `react-native-web` honors it natively via the browser.
