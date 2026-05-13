---
'styled-components': minor
---

System color keywords such as `Canvas`, `CanvasText`, `Field`, `FieldText`, `GrayText`, `Highlight`, and `LinkText` now work on React Native. They adapt to light and dark mode, so values like `color: CanvasText` and `background-color: Canvas` stay readable without writing separate colors for each appearance. The browser still handles these keywords directly on the web build.

Keywords match regardless of casing. Values inside larger shorthands, such as `border: 1px solid Canvas`, are not covered in this release; use the matching standalone color property for the same result.
