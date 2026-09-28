---
'styled-components': patch
---

A component that switches between two `css` fragments at the same interpolation now always renders the right styles. Some fragment pairs produced the same internal cache key, for example ``css`padding: ${'1'}px` `` and ``css`padding: ${'x1'}p` ``, so the component kept the first fragment's class and never emitted the second fragment's CSS.
