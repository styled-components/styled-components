---
'styled-components': minor
---

Add React Server Components (RSC) support

styled-components now automatically detects RSC environments and handles CSS delivery appropriately:

- **No `'use client'` directive required**: Components work in RSC without any wrapper or directive
- **Automatic CSS injection**: In RSC mode, styled components emit inline `<style>` tags that React 19 automatically hoists and deduplicates
- **Zero configuration**: Works out of the box with Next.js App Router and other RSC-enabled frameworks
- **Backward compatible**: Existing SSR patterns with `ServerStyleSheet` continue to work unchanged

RSC best practices:

- Prefer static styles over dynamic interpolations to avoid serialization overhead
- Use data attributes for discrete variants (e.g., `&[data-size='lg']`)
- CSS custom properties work perfectly in styled-components, can be set via inline `style`, and cascade to children:

```tsx
const Container = styled.div``;
const Button = styled.button`
  background: var(--color-primary, blue);
`;

// Variables set on parent cascade to all DOM children
<Container style={{ '--color-primary': 'orchid' }}>
  <Button>Inherits orchid background</Button>
</Container>;
```

- Use build-time CSS variable generation for theming since `ThemeProvider` is a no-op in RSC

Technical details:

- RSC detection via `typeof React.createContext === 'undefined'`
- `ThemeProvider` and `StyleSheetManager` become no-ops in RSC (children pass-through)
- React hooks are conditionally accessed via runtime guards
- CSS is retrieved from the StyleSheet Tag for inline delivery in RSC mode
