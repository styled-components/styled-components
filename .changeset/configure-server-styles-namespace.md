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

Client components take their namespace from a `<StyleSheetManager>` rendered on the client, such as the one in your style registry. Give that manager the same `namespace`, so a component rendered on both sides gets the same class.
