---
'styled-components': patch
---

A React Native scroller only snaps if it declared `scroll-snap-type` itself.

`scroll-snap-align` on a child used to make any styled `ScrollView` snap, even one that never opted in. Two scrollers sharing a card component meant the one meant to drift freely snapped along with the one that asked to. This matches css-scroll-snap-1, where the initial `scroll-snap-type: none` makes an element a non-snapping container and a descendant's `scroll-snap-align` has no effect there.
