---
'styled-components': minor
---

React Native: `em`, `lh`, and `rlh` length units are supported. Values like `padding: 1em`, `gap: 0.5lh`, and `min(10px, 5em)` resolve against the current text size and line height, so typography-based spacing can be shared across the web and React Native without rewriting everything to pixels.

`text-align: start`, `text-align: end`, and `text-align: match-parent` resolve under both left-to-right and right-to-left writing directions on React Native, matching the direction-aware behavior on the web.

Components whose CSS declares `font-size`, `line-height`, or `direction` pass the resolved value to descendants, so one text size at the top of a card can drive the relative spacing inside it.
