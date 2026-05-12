---
'styled-components': patch
---

`background-size: cover` and `background-size: contain` on React Native no longer crash the app when applied to gradient backgrounds. The native side now receives `auto` (the spec-correct fold for an image with no intrinsic dimensions), so gradients paint across the full element area as expected. `react-native-web` still receives the original keyword and resolves it against the image type natively.

`background-position` two-axis forms like `0 0`, `50% 50%`, or `top left` no longer trigger `react-native-web`'s validator warning. The native side receives the full two-axis value; the standard property name is omitted on web for multi-token forms (which the browser was already discarding silently after the warning).
