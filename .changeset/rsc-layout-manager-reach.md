---
'styled-components': major
---

A `<StyleSheetManager>` in a server component styles only the server components rendered inside it. Placing one in a Next.js layout to style every page (as the v6 guidance for `stylisPluginRSC` suggested) has been removed in favor of `configureServerStyles`, a one-line call at the top of the root layout file:

```tsx
// app/layout.tsx
import { configureServerStyles } from 'styled-components';
import { rscPlugin } from 'styled-components/plugins';

configureServerStyles({ plugins: [rscPlugin] });
```

If you upgrade from v6 with a layout manager such as `<StyleSheetManager stylisPlugins={[stylisPluginRSC]}>`, move its plugins into `configureServerStyles`; otherwise its plugins stop reaching your pages and `:first-child` / `:nth-child` selectors count the inline style tags again.
