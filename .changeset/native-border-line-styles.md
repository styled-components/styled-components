---
'styled-components': patch
---

Fixes border line styles on React Native: `hidden` acts like no border, repeated sides collapse without noise, mixed sides keep the first drawable style with a development warning, and unsupported keywords such as `double` are ignored instead of rendering as the wrong border. Web builds keep CSS border styles as authored.
