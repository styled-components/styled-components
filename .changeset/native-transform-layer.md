---
"styled-components": major
---

React Native: the CSS-to-style-object translation layer is now built in. Several long-standing limitations go away on the native path.

- `transform: matrix(...)` / `matrix3d(...)` work.
- `transform: translateX(10)` (bare number, no unit) works.
- `background-image: linear-gradient(...)` / `radial-gradient(...)` work.
- `filter: blur(4px) saturate(1.5)` and the full filter-function chain work.
- Modern color notations pass through to React Native's color parser unchanged: `rgb(r g b / a)` slash-alpha, `hwb()`, `hsl()` all work.
- `box-shadow` with spread and inset pass through as CSS strings.
- `mix-blend-mode`, `isolation`, `cursor` flow through.

The transform layer also fixes `border: none` emitting `border-style: solid` on native; it now emits `border-style: none` to match the rest of the ecosystem.
