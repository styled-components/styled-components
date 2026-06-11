---
'styled-components': minor
---

React Native: CSS scroll snap is supported on `styled.ScrollView`. Declare `scroll-snap-type` on the scroller and `scroll-snap-align: start | center | end` on its children, exactly like the web: the children become real snap positions (mixed sizes welcome), and `scroll-snap-stop: always` on a child keeps a fast fling from skipping past it. A settle guarantee makes `mandatory` literal on Android, where the platform engine can otherwise leave a caught scroller resting between snap points.

Without aligned children, `mandatory` approximates with full-scrollport paging and a development warning; for manual control pass `snapToInterval` or `snapToOffsets` on the ScrollView and your props win. `proximity` applies fast deceleration only. On the web the browser handles all of these properties directly.
