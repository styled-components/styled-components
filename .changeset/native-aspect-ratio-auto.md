---
'styled-components': patch
---

React Native: `aspect-ratio` accepts the same common forms as CSS: `16 / 9`, `auto`, `auto 16 / 9`, and `16 / 9 auto`. When `auto` is combined with a ratio on a component that does not have its own natural dimensions, styled-components uses the ratio and shows a development warning explaining that the `auto` part only applies to image-like elements.
