---
'styled-components': minor
---

React Native now respects CSS `!important`.

Authoring `color: red !important;` inside a styled component on native now behaves like the web:

- The `!important` marker is stripped from the rendered value (previously the literal string `'red !important'` leaked onto the host element and the color silently failed).
- Important declarations beat any normal declaration on the same property, regardless of source order, including overrides from matched `@media`, `@container`, `@supports`, attribute selectors, pseudo states (`:hover`, `:focus`, `:active`, `:disabled`), `:has()`, `:nth-child()`, and combinator selectors.
- A shorthand marked `!important` propagates to every longhand (`padding: 4px 8px !important` becomes important across `padding-top` / `-right` / `-bottom` / `-left`).
- Importance flows through `var()` substitution and through render-time resolvers (`light-dark()`, `env()`, viewport units, theme tokens).
- Spec-aligned with the web: a styled component's `!important` beats a runtime `style={{ ... }}` prop. Normal declarations are still overridden by the runtime `style` prop as before.
- Case-insensitive on the marker (`!IMPORTANT`) and tolerant of whitespace between `!` and `important`.

`!important` inside `@keyframes` is ignored, matching the CSS Animations spec.

Cross-component cascade of `!important` for inherited properties (a parent's `!important font-size` defeating a child's normal one) is not yet supported. Today's coverage is within-component only.
