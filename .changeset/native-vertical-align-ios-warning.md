---
"styled-components": patch
---

Development builds now warn when `vertical-align` is set on a native `<Text>` running on iOS.

React Native 0.85 has no platform API for vertically aligning text inside a fixed-height `<Text>` on iOS, so the declaration silently has no effect there. Android and rn-web continue to render the property as authored. The warning names the situation and points to the workaround: wrap the Text in a View and use `justify-content` for the vertical alignment.
