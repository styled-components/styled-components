---
'styled-components': minor
---

React Native: CSS scroll-driven animations are supported. `animation-timeline: scroll()` binds any `@keyframes` animation's progress to the scroll position of the nearest styled ScrollView, enabling parallax, scroll progress bars, and reveal-on-scroll in plain CSS. Scrollers can declare named timelines with `scroll-timeline: --name` for descendants to reference, and `animation-range` limits an animation to a slice of the scroll distance (`animation-range: entry 25% 75%`, lengths and `calc()` included). Iteration counts and all four direction modes apply across the scroll range.

`animation-timeline: view()` follows the element's own visibility within the nearest styled scroll container: the animation starts as the element scrolls into view and finishes as it scrolls out, with `animation-range` accepting the named view ranges (`cover`, `contain`, `entry`, `exit`, `entry-crossing`, `exit-crossing`) to scope the effect to entering or leaving. Elements using `view()` must be direct children of the scroll container; `view-timeline-inset` is not applied and emits a development warning.

Opacity and transform keyframes bound to `scroll()` / `view()` track scrolling exactly, so effects like reveals and parallax stay locked to the scroll position. Width, color, and other layout-bound keyframes are not driven this way, since React Native cannot animate those off the JavaScript thread.

The same declarations are supported on the web.
