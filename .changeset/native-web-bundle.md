---
'styled-components': minor
---

`styled-components/native` ships a smaller, browser-native build for react-native-web consumers. Webpack, Vite, and Metro (when targeting web) pick it up automatically; existing imports and props are unchanged.

On the web, the browser handles CSS directly, so these features resolve through native browser support:

- `var()`, `@media`, `@container`, and pseudo-classes (`:hover`, `:focus`, `:nth-child(...)`, `:has(...)`) resolve without React re-renders.
- `light-dark()` and `prefers-color-scheme` repaint without a React re-render. The document opts into `color-scheme: light dark` automatically so `useColorScheme()` reflects the OS preference.
- `dvh` / `svh` / `lvh` and the inline / block-axis viewport units (`vi`, `vb`) resolve distinctly per CSS Values 4.
- `oklch`, `oklab`, `lch`, `lab`, and `color-mix()` render in the browser's full wide gamut (Display P3 / Rec. 2020 where the monitor supports it).
- Static-mixed-unit `calc()` / `clamp()` / `min()` / `max()` resolve against the real containing block at paint time.
- `ThemeProvider` and `createTheme` tokens publish as scoped CSS custom properties, so theme changes restyle without re-rendering the subtree.

A theme variable joined to a unit (`${t.space.sm}px`) reads as a length everywhere on the web, including inside `@media`, nested rules, keyframes, global styles, and under a `StyleSheetManager` with a `namespace` or `plugins`. A `:not()` chain of plain selectors (such as `&:not([data-on])`) on the component's own element weighs nothing in the cascade, so source order decides against an attribute rule, including inside `@media`, under a namespace and in each part of a comma list; global styles keep standard CSS weight.

Lengths follow standard CSS: a unitless number or a math function on plain numbers (`width: abs(-4)`) is not a length, and the browser drops it. Write the unit (`abs(-4px)`).

The bundle is smaller because the CSS polyfills for iOS / Android are excluded. iOS and Android consumers are unaffected and continue to use the native CSS engine.

Consumers who want the same bundle without relying on bundler resolution can import it directly: `styled-components/native/web-bridge`.
