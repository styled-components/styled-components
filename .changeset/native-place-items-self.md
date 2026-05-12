---
'styled-components': patch
---

`place-items` and `place-self` shorthands now expand on React Native. The first value sets the cross-axis alignment (`align-items` / `align-self`); the second sets the main-axis half (or copies from the first if omitted). Spec-aligned keywords `start`, `end`, `self-start`, `self-end` normalize to `flex-prefixed` forms, so a single declaration works across iOS, Android, and `react-native-web`.
