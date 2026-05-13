---
'styled-components': patch
---

The `background` shorthand now works on React Native. A single declaration can set image, position, size, repeat behavior, attachment, origin, clipping, and color. Multiple background layers, `position / size`, and a final background color are supported.

When React Native does not expose a matching behavior, such as fixed background attachment or non-default background origin and clipping, styled-components shows a development warning instead of silently dropping the unsupported part. `react-native-web` continues to let the browser handle the full shorthand.
