---
'styled-components': patch
---

`aspect-ratio` on React Native now accepts the same common forms as CSS: `16 / 9`, `auto`, `auto 16 / 9`, and `16 / 9 auto`. When `auto` is combined with a ratio on a component that does not have its own natural dimensions, styled-components uses the ratio and shows a one-time development warning explaining that the `auto` part only applies to image-like elements.
