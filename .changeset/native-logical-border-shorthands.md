---
'styled-components': patch
---

Logical border shorthands now expand on React Native:

- Per-edge color, style, and width declarations such as `border-inline-start-color` and `border-block-end-width`.
- Axis shorthands such as `border-inline-color`, `border-block-width`, `border-inline`, and `border-block`.
- Single-edge shorthands such as `border-inline-start` and `border-block-end`.

Width and color apply to the matching logical edge. Per-edge border styles now show a one-time development warning on React Native, because the platform only supports one `border-style` for the whole element. `react-native-web` continues to let the browser handle per-edge styles. `outline-style: hidden` also now gets a clearer warning.
