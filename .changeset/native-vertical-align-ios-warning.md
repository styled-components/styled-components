---
'styled-components': patch
---

React Native: a development warning fires when `vertical-align` is set on a native `<Text>` or `<TextInput>` running on iOS.

React Native 0.85 has no platform API for vertically aligning text content inside a fixed-height `<Text>` or `<TextInput>` on iOS, so the declaration silently has no effect there. Android and react-native-web render the property as authored. For `<Text>`, the warning points to the workaround: wrap the Text in a View and use `justify-content` for the vertical alignment. `<TextInput>` has no Text-level workaround on iOS today.
