---
'styled-components': major
---

Browser builds use a single fast injection path; dev and production behave identically. The `disableCSSOMInjection` prop on `<StyleSheetManager>` and the `SC_DISABLE_SPEEDY` / `REACT_APP_SC_DISABLE_SPEEDY` environment variables are removed, and there is no runtime toggle into a text-based injection mode. A new `extractCSS` export is available.

To make CSS visible as text (for static-render pipelines, micro-frontend cloning, embedding into iframes or Shadow DOM, or extraction tooling), call `extractCSS()` after render to get the current CSS as a plain string:

```js
import { extractCSS } from 'styled-components';

// after rendering
const css = extractCSS();
```

The result is plain CSS without the rehydration markers used by `ServerStyleSheet`, so it can be injected directly into another document, stamped into a cloned DOM tree, or written to disk.
