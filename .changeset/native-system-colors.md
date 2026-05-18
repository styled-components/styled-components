---
'styled-components': minor
---

System color keywords such as `Canvas`, `CanvasText`, `Field`, `FieldText`, `GrayText`, `Highlight`, and `LinkText` now work on React Native when used alone or inside composite declarations such as `border`, `outline`, `background`, `text-decoration`, `text-shadow`, `box-shadow`, `filter` / `drop-shadow()`, multi-value `border-color`, and two-token `caret-color` values. Values like `color: CanvasText` and `background-color: Canvas` adapt to the user's appearance and platform color settings where React Native exposes them, with readable fallbacks for unsupported native semantics. The browser still handles these keywords directly on the web build.

Keywords match regardless of casing.
