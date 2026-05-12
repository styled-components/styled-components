---
'styled-components': minor
---

`em`, `lh`, and `rlh` font-relative length units now work on React Native. `padding: 1em`, `gap: 0.5lh`, `min(10px, 5em)` and similar resolve at render time against the inherited cascade just like in the browser, so designs that bake their rhythm in font-multiples (typography systems, content blocks, body-text padding) port across to native without rewriting to px.

`text-align: start`, `text-align: end`, and `text-align: match-parent` now resolve correctly under both left-to-right and right-to-left writing directions on React Native. Authors get the same direction-aware behavior they get on the web; the previous fall-back-to-`auto` warning is removed.

Components whose CSS declares `font-size`, `line-height`, or `direction` automatically publish the resolved value to descendants, so a single `<Text style="font-size: 18px">` at the top of a card propagates as the `em` / `lh` anchor for everything inside.
