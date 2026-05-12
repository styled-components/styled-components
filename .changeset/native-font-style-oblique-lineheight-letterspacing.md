---
'styled-components': patch
---

`font-style: oblique` now maps to `italic` on React Native; an optional `<angle>` after `oblique` (e.g. `oblique 14deg`) is dropped on native with a one-time dev warning, and `react-native-web` passes the declaration through so the browser handles slant-axis variable fonts natively.

`line-height` percentage values and non-px length units (`em`, `rem`) silently drop on React Native (RN accepts only unitless multipliers and px lengths). A one-time dev warning now surfaces both cases with the specific value involved and a concrete migration path.

`letter-spacing` with em / rem / percentage units silently drops on React Native; a one-time dev warning explains and points at the px / unitless equivalents.
