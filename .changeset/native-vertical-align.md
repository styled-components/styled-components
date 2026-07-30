---
'styled-components': patch
---

`vertical-align: top | middle | bottom` on a styled `<Text>` positions text content within the Text's box on react-native-web, matching the visual semantic of React Native's `verticalAlign` on Android (textAlignVertical). Other `vertical-align` values pass through unchanged so the browser's native baseline-shifting semantics still apply.

On iOS a development warning fires when `vertical-align` is set on a native `<Text>` or `<TextInput>`: React Native 0.85 has no platform API for vertically aligning text content inside a fixed-height `<Text>` or `<TextInput>` there, so the declaration silently has no effect. For `<Text>`, the warning points to the workaround: wrap the Text in a View and use `justify-content` for the vertical alignment. `<TextInput>` has no Text-level workaround on iOS today.
