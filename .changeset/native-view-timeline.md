---
'styled-components': minor
---

React Native: `animation-timeline: view()` is supported. Keyframe progress follows the element's own visibility within the nearest styled scroll container: the animation starts as the element scrolls into view and finishes as it scrolls out, with `animation-range` accepting the named view ranges (`cover`, `contain`, `entry`, `exit`, `entry-crossing`, `exit-crossing`) to scope the effect to entering or leaving. Elements using `view()` must be direct children of the scroll container; `view-timeline-inset` is not applied and emits a development warning.
