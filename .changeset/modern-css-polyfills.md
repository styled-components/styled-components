---
"styled-components": minor
---

Modern CSS functions now work in React Native styles — resolved to a static value at transform time when possible, or resolved at render time against the device environment.

- `clamp(10px, 50%, 400px)` / `min(100px, 50vw)` / `max(200px, 100vh)` / `calc(100vw - 40px)` with any mix of static and runtime-resolvable arms.
- `oklch(...)`, `oklab(...)`, `lch(...)`, `lab(...)` convert to sRGB hex for React Native's color parser.
- `color-mix(in <space>, …)` resolves through the requested space — `srgb` mixes in display-space sRGB; `oklab`, `oklch`, `lab`, `lch` mix perceptually and convert back to sRGB for output.
- Viewport units `vw` / `vh` / `vmin` / `vmax` / `dvh` / `svh` / `lvh` scale to the current window dimensions.
- Container query units `cqw` / `cqh` / `cqmin` / `cqmax` scale to the nearest ancestor container.
- `light-dark(light, dark)` swaps based on OS appearance.
- `env(safe-area-inset-top | right | bottom | left)` reads from the device safe area.
- Logical shorthands `margin-inline`, `margin-block`, `padding-inline`, `padding-block`, `inset-inline`, `inset-block` expand to the React Native logical-longhand props.
- `line-clamp: N` maps to `numberOfLines: N` + `overflow: hidden`.
- `&:is(:hover, :focus)` and `&:where(:pressed, :disabled)` expand into the union of individual pseudo-state buckets so the declared styles apply to each state.
- `@starting-style { ... }` is captured on the native compile output for the upcoming animation adapter.

Features React Native does not yet support — `position: fixed`, `position: sticky`, `backdrop-filter`, 3D transforms, `text-shadow`, scroll-snap, view-transitions, form-state selectors, and more — are listed in the "React Native CSS Features" compatibility tracker maintained alongside the library.
