---
"styled-components": major
---

Removed the `disableCSSOMInjection` prop on `<StyleSheetManager>` and the `SC_DISABLE_SPEEDY` / `REACT_APP_SC_DISABLE_SPEEDY` environment variables. Added a new `extractCSS` export.

Browser builds now always use the same fast injection path that production has used by default for years. There's no longer a knob to switch into a slower text-based mode at runtime, and dev and production now behave identically.

If you were using the toggle to make CSS visible as text (for static-render pipelines, micro-frontend cloning, embedding into iframes or Shadow DOM, or extraction tooling), call the new `extractCSS()` function after render to get the current CSS as a plain string:

```js
import { extractCSS } from 'styled-components';

// after rendering
const css = extractCSS();
```

The result is plain CSS without the rehydration markers used by `ServerStyleSheet`, so it can be injected directly into another document, stamped into a cloned DOM tree, or written to disk.
