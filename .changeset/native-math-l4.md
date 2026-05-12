---
'styled-components': patch
---

CSS Values 4 Math L4 functions now fold at compile time over static arms on React Native:

- `round()` with `nearest` / `up` / `down` / `to-zero` strategy and optional step
- `mod()` (math mod; sign of divisor) and `rem()` (remainder; sign of dividend)
- Trig: `sin()`, `cos()`, `tan()` (numbers in radians, angles supported)
- Inverse trig: `asin()`, `acos()`, `atan()`, `atan2()` (return `<angle>`)
- Exponential: `pow()`, `sqrt()`, `hypot()`, `log()`, `exp()`
- Sign-related: `abs()` (preserves unit), `sign()`

All compose inside `calc()` alongside other static arms. `react-native-web` defers to the browser. Runtime resolution for arms with theme sentinels or viewport units is still scoped to `calc / clamp / min / max`; out-of-fold dynamic Math L4 expressions land as no-ops on native until the runtime resolver path extends.
