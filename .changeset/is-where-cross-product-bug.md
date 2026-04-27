---
"styled-components": patch
---

Fixed selector resolution for nested rules whose parent contains a comma inside `:is()`, `:where()`, `:has()`, or an attribute selector.

Previously a parent like `:is(&:hover, .parent:hover &) .child` containing a nested rule would produce nonsense output where the nested selector got injected into the first arm of the `:is(...)` call. For example:

```jsx
const Card = styled.div`
  :is(&:hover, .parent:hover &) .child {
    color: red;
    .grandchild { color: blue; }
  }
`;
```

The grandchild rule used to compile to `:is(.card-class:hover .grandchild, .parent:hover .card-class) .child .grandchild { color: blue; }` — the `.grandchild` token leaked into the `:is()` parens. It now compiles correctly to `:is(.card-class:hover, .parent:hover .card-class) .child .grandchild { color: blue; }`. The same fix applies to commas inside `[attr*="a,b"]` and other paren/bracket-protected contexts.
