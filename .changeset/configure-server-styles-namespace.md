---
'styled-components': minor
---

`configureServerStyles` takes a `namespace`, which every server component is styled under, for the whole server process:

```tsx
// app/layout.tsx
import { configureServerStyles } from 'styled-components';

configureServerStyles({ namespace: '#app' });
```

Both `namespace` and `plugins` are optional, and each call sets both: a call without `namespace` clears it. A `<StyleSheetManager>` inside a server component starts from this namespace; its own `namespace` prop replaces it, and `namespace=""` drops it.

Client components take their namespace from a `<StyleSheetManager>` that renders in both SSR and the browser, with the same `namespace` so a component rendered on both sides gets the same class. Do not place `namespace` on a registry `<StyleSheetManager>` behind an `if (typeof window !== 'undefined') return <>{children}</>;` guard: either always render `<StyleSheetManager sheet={typeof window === 'undefined' ? styledComponentsStyleSheet.instance : undefined} namespace="#app">` or wrap the registry in a separate client `<StyleSheetManager>`, otherwise SSR and client hydration hash with different compilers and mismatch.
