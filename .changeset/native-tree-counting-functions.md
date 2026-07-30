---
'styled-components': minor
---

React Native: the CSS tree-counting functions `sibling-index()` and `sibling-count()` are supported. Styles can size, tint, or position each child by where it sits among its siblings, with one shared ruleset: `width: calc(sibling-index() * 10px)` renders a staircase, `width: calc(100% / sibling-count())` divides a row evenly. Values update automatically when siblings mount, unmount, or reorder.

`calc()` carrying `sibling-index()` or `sibling-count()` also resolves in purely percent-scaled expressions (`width: calc(sibling-index() * 13%)` resolves as a percentage of the parent) and in dynamic math inside a color channel (`oklch(0.72 0.14 calc(sibling-index() * 55))`, or a `sibling-index()` weight inside `color-mix()`, resolves to a displayable color). Mixed percent-plus-length math is not supported and resolves to absolute pixels.
