---
'styled-components': major
---

Styled components no longer honor `defaultProps`. React 19 removed `defaultProps` support from function components, so styled components can no longer inherit a parent's `defaultProps` either.

Migration: use `.attrs()` for prop defaults. The object form always wins over user-provided props (this is intentional, see the attrs FAQ). The function form lets user-provided props override the default:

```tsx
// Before (v6, no longer applies in v7)
const Button = styled.button``;
Button.defaultProps = { type: 'button' };

// After (object form always wins)
const Button = styled.button.attrs({ type: 'button' })``;

// After (user-provided overrides allowed)
const Button = styled.button.attrs<{ type?: string }>(p => ({
  type: p.type ?? 'button',
}))``;
```

For a default theme, wrap the tree in `<ThemeProvider theme={...}>` instead.
