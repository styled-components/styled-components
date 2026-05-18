---
'styled-components': patch
---

The `background` shorthand works on React Native, including multiple layers, `position / size`, and a color on the final layer. Unsupported attachment, origin, and clipping warn in development on native while web builds keep the full declaration. Invalid position, size, and repeat values are ignored instead of forwarded; invalid layered longhands now warn in development too.
