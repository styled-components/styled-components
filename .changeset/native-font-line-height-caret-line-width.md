---
'styled-components': minor
---

Expanded the React Native CSS surface with four polyfills that previously dropped silently or warned:

- `font-size` now accepts the full CSS length grammar: absolute-size keywords (`xx-small` through `xxx-large`), relative-size keywords (`larger` / `smaller`), absolute lengths (`pt`, `pc`, `in`, `cm`, `mm`, `Q`), font-relative units (`em`, `rem`, `lh`, `rlh` plus the font-metric forms `ex`, `cap`, `ch`, `ic` and their `r`-variants), viewport units (`vh`, `vw`, `dvh`, `svh`, `lvh` and width counterparts), container-query units (`cqh`, `cqw`, `cqi`, `cqb`, `cqmin`, `cqmax`), and percentages. Keyword sizes resolve to a fixed pixel ramp on every platform; everything else folds against the current environment at render time.
- `line-height` now accepts the same expanded set: absolute lengths, font-relative units (including font-metric forms), viewport units, container-query units, and percentages all resolve against the cascade instead of being dropped with a development warning.
- `caret-color` on iOS now applies the authored color to the text input's caret. iOS exposes a single surface for the caret and selection highlight, so the selection picks up the same color as a side-effect (a one-time development note names the deviation). Android and rn-web behavior is unchanged.
- `round(line-width, A)` now snaps `A` to the device pixel grid at render time using the platform's pixel ratio, matching the CSS Values 4 "snap a length as a line width" algorithm. Useful for hairline borders that should align to physical pixels regardless of screen scale.

`translate: x y z` no longer drops the Z value on React Native; the three-argument `translate(x, y, z)` form passes through unchanged on iOS and Android.

The `transform-style: preserve-3d` development warning is more accurate: animated 3D transforms are already isolated automatically by the animation adapter, and the warn no longer suggests a manual `collapsable={false}` workaround for static decls (it has no effect on iOS without a perspective surface).
