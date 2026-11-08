---
'styled-components': minor
---

React Native: `em`, `lh`, and `rlh` length units are supported. Values like `padding: 1em`, `gap: 0.5lh`, and `min(10px, 5em)` resolve against the current text size and line height, so typography-based spacing can be shared across the web and React Native without rewriting everything to pixels.

`text-align: start`, `text-align: end`, and `text-align: match-parent` resolve under both left-to-right and right-to-left writing directions on React Native, matching the direction-aware behavior on the web.

A component's font size, line height and direction reach its descendants from wherever they are set: its CSS (including `@media`, `!important` and `var()`), `attrs`, and the `style` prop as an object, an array or a `Pressable` style function. One text size at the top of a card can drive the relative spacing inside it. A `Pressable`'s `:active` font size and line height reach its descendants while it is pressed. Descendants keep their state when one of these values appears or changes, and memoized descendants re-render only when a value changes. A custom component that wraps `Pressable` passes its resting values only.
