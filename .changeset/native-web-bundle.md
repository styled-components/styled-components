---
'styled-components': minor
---

`styled-components/native` now ships a dedicated build for `react-native-web` consumers. Webpack, Vite, and Metro (when targeting web) pick it up automatically; no opt-in or import-path change is needed.

The browser handles a handful of CSS features more accurately than a render-time polyfill ever could, so the new build defers to it:

- `light-dark()` and `prefers-color-scheme` repaint without a React re-render
- `dvh` / `svh` / `lvh` and the inline / block-axis viewport units (`vi`, `vb`) resolve distinctly per CSS Values 4 instead of collapsing
- `oklch`, `oklab`, `lch`, `lab`, and `color-mix()` render in the browser's full wide gamut (Display P3 / Rec. 2020 where the monitor supports it) instead of rounding through sRGB
- Static-mixed-unit `calc()` / `clamp()` / `min()` / `max()` resolve against the real containing block at paint time instead of the closest container ancestor

The bundle is also ~10 kB smaller (gzipped: ~4 kB) than the iOS / Android bundle because the matching polyfills tree-shake out.
