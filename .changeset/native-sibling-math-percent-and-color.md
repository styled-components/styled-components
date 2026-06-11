---
'styled-components': patch
---

React Native: `calc()` carrying `sibling-index()` or `sibling-count()` is supported in two more places: a purely percent-scaled expression (for example `width: calc(sibling-index() * 13%)`) resolves as a percentage of the parent, and dynamic math inside a color channel (for example `oklch(0.72 0.14 calc(sibling-index() * 55))`, or a `sibling-index()` weight inside `color-mix()`) resolves to a displayable color. Mixed percent-plus-length math is not supported and resolves to absolute pixels.
