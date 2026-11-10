---
'styled-components': major
---

A `<StyleSheetManager>` in a server component styles only the server components rendered inside it. Placing one in a Next.js layout to style every page has been removed in favor of `configureServerStyles`, a one-line call at the top of the root layout file:

```tsx
// app/layout.tsx
import { configureServerStyles } from 'styled-components';
import { rtlPlugin } from 'styled-components/plugins';

configureServerStyles({ plugins: [rtlPlugin] });
```

If you upgrade from v6 with a layout manager that applies plugins to your pages, move its plugins into `configureServerStyles`; otherwise they stop reaching your pages. A layout manager that held only `stylisPluginRSC` can be deleted.
