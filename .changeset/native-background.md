---
'styled-components': patch
---

The `background` shorthand is supported on React Native, including multiple layers, `position / size`, and a color on the final layer. Attachment, origin, and clipping are not supported on native: they warn in development, while web builds keep the full declaration. Invalid position, size, and repeat values are ignored, and invalid layered longhands warn in development.

Layered backgrounds where every comma-separated layer repeats the same position, size, or repeat collapse the repeated value, including values produced by the shorthand. Simple center combinations such as `center top` fold to a single keyword (`top`) without changing layout.

`background-size: cover` and `background-size: contain` are supported for gradient backgrounds: the gradient paints across the full element area. On react-native-web the browser handles the keywords directly, and `background-position` values like `0 0`, `50% 50%`, and `top left` pass through without a warning.
