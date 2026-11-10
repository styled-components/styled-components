# FAQ

### Does styled-components work with React Server Components?

Yes, in React 19 and later. Server components use styled components directly, and a style registry in the root layout writes their styles, and those of client components, into the server-rendered HTML.

**For Server Components (no 'use client'):**

```tsx
// app/page.tsx - Server Component
import styled from 'styled-components';

const Container = styled.div`
  padding: 20px;
  background: orchid;
`;

export default function Page() {
  return <Container>No 'use client' needed!</Container>;
}
```

RSC environments are detected automatically. Server component styles need the style registry below.

**For Next.js App Router (the style registry):**

Add a registry to your root layout. It collects the styles of server and client components during server rendering, so pages are fully styled on first paint, even without JavaScript:

```tsx
// app/lib/registry.tsx
'use client';

import React, { useState } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { ServerStyleSheet, StyleSheetManager } from 'styled-components';

export default function StyledComponentsRegistry({ children }: { children: React.ReactNode }) {
  const [styledComponentsStyleSheet] = useState(() => new ServerStyleSheet());

  useServerInsertedHTML(() => {
    const styles = styledComponentsStyleSheet.getStyleElement();
    styledComponentsStyleSheet.instance.clearTag();
    return <>{styles}</>;
  });

  if (typeof window !== 'undefined') return <>{children}</>;

  return (
    <StyleSheetManager sheet={styledComponentsStyleSheet.instance}>{children}</StyleSheetManager>
  );
}
```

```tsx
// app/layout.tsx
import StyledComponentsRegistry from './lib/registry';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <StyledComponentsRegistry>
      <html>
        <body>{children}</body>
      </html>
    </StyledComponentsRegistry>
  );
}
```

The registry wraps `<html>` so that every server styled component renders inside it, a styled `<html>` or `<body>` included.

**Server component styles need the registry:**

A server styled component rendered without the registry above it, whether the app has no registry or the component sits outside it (a styled `<html>` or `<body>` around it, a sibling of it), gets no styles in the server-rendered HTML. Its styles apply after hydration, and development warns once. `global-error.tsx` renders only in the browser, so its styles always apply after hydration, registry or not.

**Requirements:**

- React 19+
- The Node.js runtime for any route that renders styled-components on the server. The edge runtime (`export const runtime = 'edge'`) is not supported; remove that line, or set it to `'nodejs'`
- Next.js with webpack or Turbopack, or Vite with `@vitejs/plugin-rsc` with the registry in the SSR entry. Listing `styled-components` in Next.js `serverExternalPackages` is not supported

**For traditional SSR (Next.js Pages Router, custom SSR):**

Use `ServerStyleSheet` to collect styles during server rendering; no registry or other wrapper is needed.

**RSC Best Practices:**

Since RSC environments don't support React Context, `ThemeProvider` becomes a no-op. Here are patterns that work well:

1. **Use data attributes for variants instead of dynamic props:**

```tsx
// shared/components/text.ts (NO 'use client' needed!)
export const Typography = styled.h1`
  font-size: 16px;

  &[data-size='lg'] {
    font-size: 24px;
  }
`;

// app/page.tsx (Server Component)
import { cookies } from 'next/headers';

export default async function Page() {
  const isAuth = (await cookies()).get('token')?.value;
  return (
    <Typography data-size={isAuth ? 'lg' : undefined}>
      {isAuth ? 'Welcome back!' : 'Please connect.'}
    </Typography>
  );
}
```

This generates static CSS with a sensible default; no attribute needed for the base case.

2. **Use CSS custom properties for dynamic values:**

CSS variables can be set via inline `style` and cascade to all DOM children, which suits RSC theming:

```tsx
const Container = styled.div``;
const Card = styled.div`
  background: var(--bg, white);
  color: var(--text, black);
`;
const Button = styled.button`
  background: var(--color-primary, blue);
`;

// app/page.tsx (Server Component)
export default async function Page() {
  const theme = await getUserTheme();
  return (
    <Container style={{ '--color-primary': theme.primary, '--bg': theme.cardBg }}>
      <Card>
        <Button>Inherits --color-primary from Container</Button>
      </Card>
    </Container>
  );
}
```

This gives you `ThemeProvider`-like cascading without React Context.

3. **Prefer static styles over dynamic interpolations:**

When possible, define all style variants ahead-of-time using CSS selectors rather than JavaScript interpolations to avoid serialization overhead in RSC.

**Referencing a client component from server styles:**

A styled component defined in a `'use client'` module has no class a server component can read. When a server component's styles interpolate one (`${ClientCard}:hover &`, `@container ${ClientCard} (...)`), the selector, at-rule, or declaration holding it is left out of the server's CSS, and a development warning names the component. Everything else in the template still applies. To target it from server styles, define the styled component in a module without `'use client'`; a server component can render it and a client component can import it.

### My styles are being repeated multiple times

You might notice that generating styles based on dynamic props will result in repeated CSS declarations. In other words, in the following example:

```js
const Button = styled.button`
  /* If it's a small button use less padding */
  padding: ${props => (props.small ? '0.25em 1em' : '0.5em 2em')};

  /* …more styles here… */
`;
```

You will ultimately end up with two classes, both of which contain the same "more styles here" lines:

```css
.foo {
  padding: 0.25em 1em;
  /* …more styles here… */
}
.bar {
  padding: 0.5em 2em;
  /* …more styles here… */
}
```

While this isn't how you would normally write CSS, it's not actually a big issue:

- On the server, you can gzip your CSS to take care of any duplication.
- On the client, this only increases the amount of _generated_ CSS (and not the size of the bundle sent by the server), which doesn't have any noticeable performance impact.
