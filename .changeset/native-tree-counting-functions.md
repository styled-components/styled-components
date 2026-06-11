---
'styled-components': minor
---

React Native: the CSS tree-counting functions `sibling-index()` and `sibling-count()` are supported. Styles can size, tint, or position each child by where it sits among its siblings, with one shared ruleset: `width: calc(sibling-index() * 10px)` renders a staircase, `width: calc(100% / sibling-count())` divides a row evenly. Values update automatically when siblings mount, unmount, or reorder.
