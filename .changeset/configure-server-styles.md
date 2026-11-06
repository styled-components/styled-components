---
'styled-components': minor
---

`configureServerStyles({ stylisPlugins })` sets the plugins every server component is styled with, for the whole server process. Call it once, at the top level of a module every server render loads first. In Next.js that's the root layout file:

```tsx
// app/layout.tsx
import { configureServerStyles, stylisPluginRSC } from 'styled-components';

configureServerStyles({ stylisPlugins: [stylisPluginRSC] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // ...
}
```

It reaches every server-rendered page and nested layout, including pages prerendered at build time and pages reached by client-side navigation, which a `StyleSheetManager` in a shared layout does not reach. A `StyleSheetManager` in a server component starts from these plugins; its own `stylisPlugins` prop replaces them, and `stylisPlugins={[]}` drops them.

It applies to server components only. Client components take their plugins from a `StyleSheetManager` rendered on the client, such as the one in your style registry. Make one call per app: a later call replaces an earlier one and applies to renders that start after it.
