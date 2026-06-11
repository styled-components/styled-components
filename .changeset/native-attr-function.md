---
'styled-components': minor
---

React Native: the CSS `attr()` function is supported. Styles can read the component's own props as typed CSS values: `width: attr(data-size px, 48px)` sizes from a `data-size` prop and uses the fallback when the prop is missing or invalid. Supported types include unit names (`px`, `%`, `deg`, ...), `number`, `raw-string`, and `type()` forms for lengths, numbers, percentages, and colors. `attr()` composes inside `calc()`, and fallbacks can themselves be dynamic values like `light-dark()`.
