---
'styled-components': minor
---

React Native: modern CSS functions are supported in styles. Values that can be calculated immediately are converted before they reach React Native, while values that depend on the device, like viewport size, safe area, container size, or color scheme, update when those inputs change.

```tsx
import styled from 'styled-components/native';

const Card = styled.View`
  width: clamp(240px, 80vw, 480px);
  background-color: light-dark(white, #111);
  padding-top: env(safe-area-inset-top);
  border-radius: 8px;

  @container card (min-width: 320px) {
    padding: 24px;
  }
`;
```

- `clamp(10px, 50%, 400px)`, `min(100px, 50vw)`, `max(200px, 100vh)`, and `calc(100vw - 40px)`.
- Math functions like `round()`, `mod()`, `rem()`, `sin()`, `cos()`, `tan()`, `pow()`, `sqrt()`, `hypot()`, `log()`, `exp()`, `abs()`, and `sign()` when their inputs are known before render.
- `oklch(...)`, `oklab(...)`, `lch(...)`, `lab(...)` resolve to a color React Native can render. Wide-gamut inputs that fall outside sRGB are mapped to the closest in-gamut color while preserving hue, so the rendered result stays as close as possible to what was written.
- `color-mix(in <space>, …)` mixes through the requested space (`srgb`, `oklab`, `oklch`, `lab`, `lch`) and converts back to sRGB for display.
- Viewport units `vw` / `vh` / `vmin` / `vmax` / `dvh` / `svh` / `lvh` scale to the current window dimensions.
- Container query units `cqw` / `cqh` / `cqmin` / `cqmax` scale to the nearest ancestor container.
- `light-dark(light, dark)` swaps based on OS appearance.
- `env(safe-area-inset-top | right | bottom | left)` reads from the device safe area.
- Logical shorthands `margin-inline`, `margin-block`, `padding-inline`, `padding-block`, `inset-inline`, `inset-block` apply as authored.
- `line-clamp: N` truncates to N lines.
- `&:is(:hover, :focus)` and `&:where(:pressed, :disabled)` apply the styles to each listed state.
- `@media (min-aspect-ratio: 16/9)`, `(max-aspect-ratio: 1/1)`, and exact `(aspect-ratio: 4/3)` match the device's current width-to-height ratio. Bare numbers are treated like `<n>/1`, matching browser behavior.
- `@starting-style { ... }` declarations apply on first mount: the starting values are the initial state and any transitions on the same component animate from there toward the resolved values.

The full, current support matrix for CSS on React Native lives at https://styled-components.com/docs/compatibility.
