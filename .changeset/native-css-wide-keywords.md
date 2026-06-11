---
'styled-components': patch
---

React Native: CSS-wide keywords (`initial`, `inherit`, `unset`, `revert`, `revert-layer`) are not supported: it has no cascade to resolve them against and its style defaults differ from the CSS initial values, so the declaration is dropped with a development warning suggesting an explicit value. On the web the browser resolves the keywords as usual. `direction: inherit` and `flex: initial` are supported, since React Native and the flex shorthand implement those directly.
