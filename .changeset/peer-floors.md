---
"styled-components": major
---

Raised peer dependency floors:

- `react` and `react-dom` now require `>= 19.0.0` (was `>= 16.8`).
- `react-native` now requires `>= 0.85.0` (was `>= 0.68`).
- `css-to-react-native` is no longer a peer dependency. Apps that listed it solely for styled-components can drop it from their `package.json`.

Older React / React Native projects should stay on styled-components v6.
