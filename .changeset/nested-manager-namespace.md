---
'styled-components': major
---

A nested `<StyleSheetManager>` without a `namespace` prop uses its parent's namespace, in client and server components alike. Its styles stay scoped to the parent's container.

```tsx
<StyleSheetManager namespace="#app">
  <StyleSheetManager plugins={[myPlugin]}>
    <Card /> {/* styled under #app */}
  </StyleSheetManager>
</StyleSheetManager>
```

To render a subtree without the namespace, such as a portal mounted outside the container, pass `namespace=""` to its manager. Components under a manager that inherits a namespace get different class names than under one without it.
