---
'styled-components': minor
---

Four React Native CSS surfaces are supported:

- `font-size` accepts the full CSS length grammar: absolute-size keywords (`xx-small` through `xxx-large`), relative-size keywords (`larger` / `smaller`), absolute lengths (`pt`, `pc`, `in`, `cm`, `mm`, `Q`), font-relative units (`em`, `rem`, `lh`, `rlh` plus the font-metric forms `ex`, `cap`, `ch`, `ic` and their `r`-variants), viewport units (`vh`, `vw`, `dvh`, `svh`, `lvh` and width counterparts), container-query units (`cqh`, `cqw`, `cqi`, `cqb`, `cqmin`, `cqmax`), and percentages. Keyword sizes resolve to a fixed pixel ramp on every platform; everything else folds against the current environment at render time.
- `line-height` accepts the same expanded set: absolute lengths, font-relative units (including font-metric forms), viewport units, container-query units, and percentages all resolve against the cascade.
- `caret-color` on iOS applies the authored color to the text input's caret. iOS exposes a single surface for the caret and selection highlight, so the selection picks up the same color as a side-effect (a development warning names the deviation). Android maps the color to the caret; react-native-web lets the browser handle it.
- `round(line-width, A)` snaps `A` to the device pixel grid at render time using the platform's pixel ratio, matching the CSS Values 4 "snap a length as a line width" algorithm. Useful for hairline borders that should align to physical pixels regardless of screen scale.

`translate: x y z` keeps its Z value on React Native; the three-argument `translate(x, y, z)` form is supported on iOS and Android.

`transform-style: preserve-3d` is isolated automatically for animated 3D transforms; the development warning for static declarations names that they have no effect on iOS without a perspective surface.
