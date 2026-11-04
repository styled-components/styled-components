---
'styled-components': patch
---

In server components, a `<StyleSheetManager>`'s settings (`plugins`, `namespace`, `shouldForwardProp`) apply to exactly the components rendered inside it, however large or async the page is.

```jsx
<StyleSheetManager plugins={[outerPlugin]}>
  <ChildA />
  <StyleSheetManager plugins={[innerPlugin]}>
    <ChildB />
  </StyleSheetManager>
  <ChildC />
</StyleSheetManager>
<Sidebar />
```

`ChildB` is styled with the inner manager's plugins, `ChildA` and `ChildC` with the outer manager's, and `Sidebar` with neither.

Client components are unchanged: they take their settings from the nearest `<StyleSheetManager>` rendered on the client, such as the one in your style registry.
