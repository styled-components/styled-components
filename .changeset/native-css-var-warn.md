---
'styled-components': minor
---

React Native supports CSS custom properties through the component cascade.

Declare a property on any styled component (`--brand: tomato;`) and descendants can read it back through the standard `var()` syntax (`color: var(--brand);`). The substitution honors the full CSS Variables Module Level 1 contract: fallbacks (`var(--maybe, default)`), nested resolution (`var(--a, var(--b, default))`), nested resolution in the name argument (`var(var(--name-of-name))`), cycle detection, and case-sensitive names. A substituted shorthand expands to its longhands like authored CSS, so `margin: var(--spacing);` with `--spacing: 4px 8px;` sets the individual margin sides.

Spec compliance touches:

- `--foo: initial` correctly resets a custom property to the guaranteed-invalid value, so a downstream `var(--foo, fallback)` substitutes the fallback.
- Trailing `!important` is stripped from custom property values before they reach the cascade.
- A literal `var(--name)` inside a quoted CSS string (e.g. `content: "var(--brand)"`) is preserved verbatim.
- Bare `--` declarations are dropped (reserved for future use per the spec) and never leak as a style key.

The react-native-web bundle leaves both the declarations and `var()` references in place so the browser's own cascade handles them. A development warning fires on a `var()` reference only when no ancestor declared the property and no fallback was provided.
