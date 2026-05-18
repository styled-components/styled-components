---
'styled-components': major
---

Raised peer dependency floors:

- `react` and `react-dom` now require `>= 19.0.0` (was `>= 16.8`).
- `react-native` now requires `>= 0.85.0` (was `>= 0.68`).
- `css-to-react-native` is no longer a peer dependency. Apps that listed it solely for styled-components can drop it from their `package.json`.
- The `enableVendorPrefixes` prop on `<StyleSheetManager>` and the runtime vendor prefixer have been removed. Modern browser targets handle prefixing natively; for the few properties that still need them (e.g. `-webkit-backdrop-filter` on Safari), declare both the prefixed and unprefixed forms in your CSS, or run a build-time PostCSS transform.

Older React / React Native projects should stay on styled-components v6.
