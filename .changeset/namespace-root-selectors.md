---
'styled-components': patch
---

Under a `StyleSheetManager` `namespace`, selectors that start at the document root apply when the namespace element is `<html>`. With `namespace="#app"` on `<html id="app">`:

```tsx
const Card = styled.div`
  html.dark & {
    color: white;
  }
`;

const Transitions = createGlobalStyle`
  ::view-transition-old(root) {
    animation-duration: 200ms;
  }
`;
```

Both rules apply. `html.dark &` styles the card on a dark page, and the view transition rule applies to the page's transitions and to a transition started on an element inside `#app`. A root selector inside `:is()` or `:where()`, such as `:where(html.dark) &`, is prefixed like any other selector, so write it as `html.dark &` for it to apply. When the namespace is on a container inside the page, a rule starting at `html` or `:root` applies to nothing, so an embedded app never styles its host page. The joined form applies to a namespace made of ids, classes, attributes, or pseudo-classes with no spaces between them (`#app`, `.app.dark`, `[data-app]`). Any other namespace, such as `main #app` or `div#app`, is prefixed the same as every other selector.
