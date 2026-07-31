---
'styled-components': minor
---

Client styles inject through `useInsertionEffect`.

Class names are still resolved during render so elements get the right `class` on the first paint, but the stylesheet write runs in the insertion effect after React commits. Discarded concurrent renders no longer leave rules in the document, and a committed update still gets its rules even when an earlier concurrent attempt for the same styles was discarded. Blocking updates (concurrent features off) behave the same: styles apply on commit, not mid-render.

`ServerStyleSheet` SSR and React Server Components still flush during render, where insertion effects do not run.
