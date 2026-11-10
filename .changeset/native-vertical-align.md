---
'styled-components': patch
---

`vertical-align: top | middle | bottom` on a styled `<Text>` positions text content within the Text's box on react-native-web, matching the visual semantic of React Native's `verticalAlign` on Android (textAlignVertical). It applies wherever a rule styles the component's own element, including `&:hover`, attribute selectors and rules inside `@media`, also under a `StyleSheetManager` namespace; rules on descendants or pseudo-elements, and global styles, keep the browser's own `vertical-align`. Any other value in a later rule, such as `vertical-align: baseline`, undoes the alignment, and the browser's own baseline-shifting semantics still apply to inline text. It needs a browser from 2024 or later (Chrome 123, Firefox 125, Safari 17.4); older browsers ignore the alignment.

On iOS a development warning fires when `vertical-align` is set on a native `<Text>` or `<TextInput>`: React Native 0.85 has no platform API for vertically aligning text content inside a fixed-height `<Text>` or `<TextInput>` there, so the declaration silently has no effect. For `<Text>`, the warning points to the workaround: wrap the Text in a View and use `justify-content` for the vertical alignment. `<TextInput>` has no Text-level workaround on iOS today.
