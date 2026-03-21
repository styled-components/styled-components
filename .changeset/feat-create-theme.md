---
'styled-components': minor
---

Add `createTheme` utility for CSS variable theming that works across RSC and client components.

`createTheme` takes a default theme object and returns an object with the same shape where every leaf value is replaced with a `var(--prefix-path, fallback)` CSS string. This lets you use theme values in RSC styled components (which can't access React context) while keeping the same tokens as client components.

```ts
import { createTheme } from 'styled-components';

const theme = createTheme({
  colors: { primary: '#0070f3', text: '#111' }
});

// theme.colors.primary → "var(--sc-colors-primary, #0070f3)"
// theme.colors.text    → "var(--sc-colors-text, #111)"
// theme.raw            → { colors: { primary: '#0070f3', text: '#111' } }
```

Pass the returned object to `ThemeProvider` so that `p.theme.colors.*` interpolations produce CSS variable references instead of literal values. This gives you stable class name hashing across themes (no hydration mismatches when switching light/dark) and lets CSS variables handle the actual theming.

**`theme.resolve(el?)`** — read the current computed CSS variable values from the DOM, returning an object with the same shape as the original theme but with resolved values. Useful for JS logic that needs the actual current color (e.g., canvas rendering, conditional branching). Client-only.

```ts
const current = theme.resolve();
// current.colors.primary → "#3b82f6" (dark mode value)
// current.colors.text    → "#f9fafb"

// Scoped to a specific element:
const scoped = theme.resolve(myElement);
```

Options:
- `prefix` (default: `"sc"`) — namespace for CSS variable names
- `selector` (default: `":root"`) — CSS selector for variable declarations, use `":host"` for Shadow DOM
