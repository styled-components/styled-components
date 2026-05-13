---
'styled-components': minor
---

`em`, `lh`, and `rlh` length units now work on React Native. Values like `padding: 1em`, `gap: 0.5lh`, and `min(10px, 5em)` resolve against the current text size and line height, so typography-based spacing can be shared across web and native without rewriting everything to pixels.

`text-align: start`, `text-align: end`, and `text-align: match-parent` now resolve correctly under both left-to-right and right-to-left writing directions on React Native. Authors get the same direction-aware behavior they get on the web; the previous fall-back-to-`auto` warning is removed.

Components whose CSS declares `font-size`, `line-height`, or `direction` pass the resolved value to descendants, so one text size at the top of a card can drive the relative spacing inside it.
