---
'styled-components': patch
---

`vertical-align: top | middle | bottom` on a styled `<Text>` now positions text content within the Text's box on `react-native-web`, matching the visual semantic of React Native's `verticalAlign` on Android (textAlignVertical). Other `vertical-align` values pass through unchanged so the browser's native baseline-shifting semantics still apply.
