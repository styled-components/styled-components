---
'styled-components': patch
---

`place-items` and `place-self` shorthands now work on React Native. They expand to the matching `align-*` and `justify-*` properties, with the second value copied from the first when it is omitted. Keywords like `start`, `end`, `self-start`, and `self-end` are translated to the React Native values needed for the same layout on iOS, Android, and `react-native-web`.
