---
'styled-components': minor
---

Expanded the React Native CSS surface with four polyfills that previously dropped silently or warned:

- `font-size` now accepts the full CSS Fonts 4 grammar: absolute-size keywords (`xx-small` through `xxx-large`), relative-size keywords (`larger` / `smaller`), font-relative units (`em` / `rem` / `lh` / `rlh`), and percentages. Keyword sizes resolve to a fixed pixel ramp on every platform; relative sizes and percentages fold against the inherited typography at render time.
- `line-height` percentages and font-relative units (`em` / `rem` / `lh` / `rlh`) now resolve against the cascade instead of being dropped with a development warning.
- `caret-color` on iOS now applies the authored color to the text input's caret. iOS exposes a single surface for the caret and selection highlight, so the selection picks up the same color as a side-effect (a one-time development note names the deviation). Android and rn-web behavior is unchanged.
- `round(line-width, A)` now snaps `A` to the device pixel grid at render time using the platform's pixel ratio, matching the CSS Values 4 "snap a length as a line width" algorithm. Useful for hairline borders that should align to physical pixels regardless of screen scale.

`translate: x y z` no longer drops the Z value on React Native; the three-argument `translate(x, y, z)` form passes through unchanged on iOS and Android.

The `transform-style: preserve-3d` development warning is more accurate: animated 3D transforms are already isolated automatically by the animation adapter, and the warn no longer suggests a manual `collapsable={false}` workaround for static decls (it has no effect on iOS without a perspective surface).
