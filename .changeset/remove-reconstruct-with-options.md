---
'styled-components': major
---

`StyleSheet.prototype.reconstructWithOptions` has been removed in favor of passing `target` or `nonce` to `StyleSheetManager` in the browser, or `nonce` to `new ServerStyleSheet({ nonce })` during SSR.
