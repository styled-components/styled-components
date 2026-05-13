---
'styled-components': patch
---

`font-style: oblique` now maps to `italic` on React Native. If an angle is provided, such as `oblique 14deg`, styled-components shows a one-time development warning because React Native cannot control the exact slant. `react-native-web` still passes the declaration to the browser.

`line-height` values React Native cannot apply, such as percentages, `em`, and `rem`, now show a one-time development warning with the specific value and a suggested replacement.

`letter-spacing` values written with `em`, `rem`, or percentages also now warn on React Native and point to pixel or unitless values instead.
