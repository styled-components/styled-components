---
'styled-components': minor
---

CSS `text-overflow: ellipsis | clip` now works on React Native; pair it with `line-clamp` or `text-wrap: nowrap` so an overflow is actually possible. Web builds pass the value straight through.

`direction: ltr | rtl | inherit` now also drives bidi text inside `<Text>` on native so it follows the cascade without having to set a separate prop. Web builds remain unchanged (the browser already drives Text bidi from `direction`).

`outline: 2px hidden red` and other `outline` declarations that include the `hidden` keyword now drop with a development warning, since `hidden` is not a legal outline style per the CSS UI spec. Use `outline: none` to remove an outline.
