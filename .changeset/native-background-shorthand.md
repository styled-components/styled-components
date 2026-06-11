---
'styled-components': patch
---

The `background` shorthand is supported on React Native, including multiple layers, `position / size`, and a color on the final layer. Attachment, origin, and clipping are not supported on native: they warn in development, while web builds keep the full declaration. Invalid position, size, and repeat values are ignored, and invalid layered longhands warn in development.
