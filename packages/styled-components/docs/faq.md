# FAQ

### Does styled-components work with React Server Components?

Yes! styled-components fully supports React Server Components (RSC) with automatic style injection in React 19+.

**For Server Components (no 'use client'):**

With React 19, styled-components works out of the box in Server Components with no wrapper needed:

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

**How it works:**

- Styled-components automatically detects RSC environments (when `React.createContext` is unavailable)
- Styles are rendered as `<style>` tags with React 19's `precedence` attribute
- React automatically hoists styles to `<head>` and deduplicates them
- Zero configuration required!

**For Next.js App Router (SSR Style Extraction):**

You need to add a registry in your root layout to extract styles during server rendering. This ensures styles work even without JavaScript enabled:

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
    <html>
      <body>
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
      </body>
    </html>
  );
}
```

**Why the registry is needed:**

- Extracts styles during server rendering using `useServerInsertedHTML`
- Ensures styles are sent inline with HTML for no-JS support
- React 19's automatic style hoisting only works post-hydration on the client
- Without the registry, pages will have no styles until JavaScript loads

**Requirements:**

- React 19+ for automatic RSC support with style hoisting (client-side)
- Registry pattern required for SSR style extraction (all React versions)
- For React 16.8-18.x: traditional SSR with `ServerStyleSheet` continues to work as before

**For traditional SSR (Next.js Pages Router, custom SSR):**

Continue using `ServerStyleSheet` as before - no changes needed!

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

This generates static CSS with a sensible default—no attribute needed for the base case.

2. **Use CSS custom properties for dynamic values:**

CSS variables can be set via inline `style` and cascade to all DOM children—perfect for RSC theming:

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
