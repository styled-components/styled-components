---
'styled-components': patch
---

Logical border shorthands now expand on React Native:

- 12 longhands: `border-inline-start-{color,style,width}`, `border-inline-end-{color,style,width}`, `border-block-start-{color,style,width}`, `border-block-end-{color,style,width}`.
- 6 axis shorthands: `border-inline-{color,style,width}` and `border-block-{color,style,width}` (accept 1-2 values that cycle to start / end).
- 4 composite single-edge shorthands: `border-inline-start`, `border-inline-end`, `border-block-start`, `border-block-end`.
- 2 mode-spanning shorthands: `border-inline` and `border-block` (apply to both edges of the axis).

Width and color land on the matching logical edges; per-edge styles silently dropped before now warn once (React Native exposes only a whole-element `border-style`). `react-native-web` honors per-edge styles via the browser. `outline-style: hidden` is invalid per CSS UI 4 §3.3 and now warns explicitly instead of falling through to the generic shorthand-parse warning.
