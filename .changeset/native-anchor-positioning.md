---
'styled-components': minor
---

Added CSS anchor positioning on React Native (core subset). Declare `anchor-name: --save` on any styled element and position absolutely-placed siblings against it in pure CSS: `top: anchor(--save bottom); left: anchor(--save left); width: anchor-size(--save width);`. Anchored elements track the anchor as it moves or resizes, fallback values apply when the anchor is missing, `position-anchor` supplies an implicit target, and the functions compose inside `calc()`. Supported subset: physical side keywords in `top`/`left` insets, with the anchor and positioned element sharing a parent; unsupported forms fall back with a development warning. On the web the browser handles the same declarations natively.
