---
'styled-components': patch
---

React Native: logical border shorthands expand to their longhands:

- Per-edge color, style, and width declarations such as `border-inline-start-color` and `border-block-end-width`.
- Axis shorthands such as `border-inline-color`, `border-block-width`, `border-inline`, and `border-block`.
- Single-edge shorthands such as `border-inline-start` and `border-block-end`.

Width and color apply to the matching logical edge. Per-edge border styles show a development warning on React Native, because the platform supports one `border-style` for the whole element. On react-native-web the browser handles per-edge styles. `outline-style: hidden` gets a clearer warning.
