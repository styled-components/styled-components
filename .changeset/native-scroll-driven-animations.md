---
'styled-components': minor
---

React Native: CSS scroll-driven animations are supported. `animation-timeline: scroll()` binds any `@keyframes` animation's progress to the scroll position of the nearest styled ScrollView, enabling parallax, scroll progress bars, and reveal-on-scroll in plain CSS. Scrollers can declare named timelines with `scroll-timeline: --name` for descendants to reference, and `animation-range` limits an animation to a slice of the scroll distance (`animation-range: entry 25% 75%`, lengths and `calc()` included). Iteration counts and all four direction modes apply across the scroll range. The same declarations are supported on the web.
