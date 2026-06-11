---
'styled-components': minor
---

React Native: system color keywords such as `Canvas`, `CanvasText`, `Field`, `FieldText`, `GrayText`, `Highlight`, and `LinkText` are supported when used alone or inside composite declarations such as `border`, `outline`, `background`, `text-decoration`, `text-shadow`, `box-shadow`, `filter` / `drop-shadow()`, multi-value `border-color`, and two-token `caret-color` values. Values like `color: CanvasText` and `background-color: Canvas` adapt to the user's appearance and platform color settings where React Native exposes them, with readable fallbacks for unsupported native semantics. On the web the browser handles these keywords directly.

Keywords match regardless of casing.
