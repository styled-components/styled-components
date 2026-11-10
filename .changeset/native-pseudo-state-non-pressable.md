---
'styled-components': patch
---

React Native: pseudo-class rules behave correctly on every element. `&:active`, `&:hover` and `&:focus` follow the live interaction state only `Pressable` supplies. On any other element (`View`, `Text`, ...) the base styles apply normally, the unreachable rules are skipped, and a development warning names the elements that do support them. A custom component that spreads `style` onto a `View` keeps all its styles when its only state rules are `&:disabled`, `&:enabled`, `&:read-only` or `&:read-write`. A negation inside `@media` or `@supports` keeps its meaning: `&:not(:active)` applies only while the element is not pressed, and `&:not([data-busy])` only while the attribute is absent. Rules fenced behind a media query that does not match (such as web-only `@media (hover: hover)` blocks) stay silent. See https://styled-components.com/docs/compatibility for which element supports each pseudo-class.
