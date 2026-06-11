---
'styled-components': minor
---

CSS `text-overflow: ellipsis | clip` is supported on every target. Pair it with `line-clamp` or `text-wrap: nowrap` so the content can actually overflow.

`direction: ltr | rtl | inherit` follows the cascade through bidi-aware text on every target without having to set a second prop.

`outline` declarations that include the `hidden` keyword, like `outline: 2px hidden red`, are not supported and drop with a development warning, since `hidden` is not a legal outline style per the CSS UI spec. Use `outline: none` to remove an outline.
