---
'styled-components': minor
---

`configureServerStyles({ plugins })` sets the plugins every server component is styled with, for the whole server process. Call it once, at the top level of a module every server render loads first. In Next.js that's the root layout file:

```tsx
// app/layout.tsx
import { configureServerStyles } from 'styled-components';
import { rtlPlugin } from 'styled-components/plugins';

configureServerStyles({ plugins: [rtlPlugin] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // ...
}
```

It reaches every server-rendered page and nested layout, including pages prerendered at build time and pages reached by client-side navigation. A `<StyleSheetManager>` inside a server component starts from these plugins; its own `plugins` prop replaces them, and `plugins={[]}` drops them.

It applies to server components only. Client components take their plugins from a `<StyleSheetManager>` rendered on the client, such as the one in your style registry. Make one call per app: a later call replaces an earlier one and applies to renders that start after it. Next.js `instrumentation.ts` is not a reliable place for it, because Next.js does not run it while prerendering pages at build time.
