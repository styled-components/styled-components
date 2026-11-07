---
'styled-components': patch
---

A server component's styles, `keyframes` templates included, can hold a `'use client'` export, or a value a server action received from the client, without the render throwing or a selector matching more than written. The server cannot read either one, so the part of the styles holding it is left out: one selector in a list (the whole rule when it was the only one), an at-rule, a keyframes stop, or a declaration. Every other rule still applies. In development a warning names the `'use client'` export, or its module for a default export.

```tsx
// Card.tsx starts with 'use client'
import { Card } from './Card';

const List = styled.ul`
  ${Card} + ${Card} {
    margin-top: 8px;
  }
`;
```

Here the rule for `${Card}` is left out on the server. To select `Card` from a server component, define the styled component in a module without `'use client'`. A `view-transition-class` or `container-name` left out this way keeps the class the component gets automatically.
