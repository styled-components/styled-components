---
'styled-components': patch
---

Nested rules resolve correctly when their parent selector contains a comma inside `:is()`, `:where()`, `:has()`, or an attribute selector:

```jsx
const Card = styled.div`
  :is(&:hover, .parent:hover &) .child {
    color: red;
    .grandchild {
      color: blue;
    }
  }
`;
```

The grandchild rule compiles to `:is(.card-class:hover, .parent:hover .card-class) .child .grandchild { color: blue; }`, keeping the `:is()` arms intact. Commas inside `[attr*="a,b"]` and other paren- or bracket-protected contexts resolve the same way.
