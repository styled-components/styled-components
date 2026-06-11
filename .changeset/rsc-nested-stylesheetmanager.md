---
'styled-components': patch
---

Fixed a styling leak between sibling subtrees when a nested `<StyleSheetManager>` sits beside other children of an outer `<StyleSheetManager>` in a server component tree.

```jsx
<StyleSheetManager plugins={[outerPlugin]}>
  <ChildA />
  <StyleSheetManager plugins={[innerPlugin]}>
    <ChildB />
  </StyleSheetManager>
  <ChildC />
</StyleSheetManager>
```

`ChildC` is styled with the outer manager's plugins, not the inner manager's. The inner subtree's configuration stays scoped to `ChildB`.
