---
'styled-components': minor
---

React Native: relative color syntax is supported for the `rgb()`, `hsl()`, `hwb()`, and `color()` forms, alongside `oklch()` / `oklab()` / `lch()` / `lab()`. A value like `color: rgb(from ${theme.brand} r g b)` resolves to a color React Native can display on iOS, Android, and react-native-web, whether the base is a literal color, another color function, or a resolved theme value.
