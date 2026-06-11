---
'styled-components': patch
---

React Native: scroll-driven animations keep pace with the finger. Opacity and transform keyframes bound to `animation-timeline: scroll()` / `view()` track scrolling exactly, so effects like reveals and parallax stay locked to the scroll position. Width, color, and other layout-bound keyframes are not driven this way, since React Native cannot animate those off the JavaScript thread.
