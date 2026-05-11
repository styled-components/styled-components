---
"styled-components": patch
---

Fixed a styling leak when a nested `<StyleSheetManager>` sits beside other children of an outer `<StyleSheetManager>` in a server component tree.

```jsx
<StyleSheetManager plugins={[outerPlugin]}>
  <ChildA />
  <StyleSheetManager plugins={[innerPlugin]}>
    <ChildB />
  </StyleSheetManager>
  <ChildC />
</StyleSheetManager>
```

Previously `ChildC` was being styled with the inner manager's plugins because the inner subtree's configuration leaked back out. `ChildC` now correctly uses the outer manager's plugins.
