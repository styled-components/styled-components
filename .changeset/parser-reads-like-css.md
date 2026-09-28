---
'styled-components': patch
---

Styles now read the way a browser reads CSS, in a few more places:

- A comment inside parentheses, such as `:is(/* note */ a, b)`, is removed like any other comment, and an interpolation written inside it is never called.
- A stray `}` drops only the statement it ends. The rest of the style still applies.
- A space after a comma is kept as written (`font-family: Inter, sans-serif`), and web and React Native now see identical text.
- An interpolated value may hold `{` or `}` inside a string or `url(`, such as an SVG data URI or `content: "{"`.
- In development, a function interpolated into a `keyframes` template warns. `keyframes` has no props to call it with, so the function is written as text.
