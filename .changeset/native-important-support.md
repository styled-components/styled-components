---
'styled-components': minor
---

React Native supports CSS `!important`.

Authoring `color: red !important;` inside a styled component on native behaves like the web:

- The `!important` marker is stripped from the rendered value, and the declaration applies its color.
- Important declarations beat any normal declaration on the same property, regardless of source order, including overrides from matched `@media`, `@container`, `@supports`, attribute selectors, pseudo states (`:hover`, `:focus`, `:active`, `:disabled`), `:has()`, `:nth-child()`, and combinator selectors.
- A shorthand marked `!important` propagates to every longhand (`padding: 4px 8px !important` is important across `padding-top` / `-right` / `-bottom` / `-left`).
- Importance carries through `var()` substitution and render-time resolvers (`light-dark()`, `env()`, viewport units, theme tokens).
- Spec-aligned with the web: a styled component's `!important` beats a runtime `style={{ ... }}` prop, while normal declarations stay overridden by the runtime `style` prop.
- Case-insensitive on the marker (`!IMPORTANT`) and tolerant of whitespace between `!` and `important`.

`!important` inside `@keyframes` is ignored, matching the CSS Animations spec.

Cross-component cascade of `!important` for inherited properties (a parent's `!important font-size` defeating a child's normal one) is not supported; coverage is within-component only.
