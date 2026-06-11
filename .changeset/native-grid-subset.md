---
'styled-components': minor
---

React Native: a `display: grid` layout subset is supported. A grid container written as `display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;` lays its direct styled children into equal columns, sizing each child to its share of the measured container width. Use `grid-column: span 2` to make a child span multiple columns.

```tsx
const Grid = styled.View`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`;
const Wide = styled.View`
  grid-column: span 2;
`;
```

The supported subset is equal `1fr` columns (`repeat(N, 1fr)` or a `1fr 1fr 1fr` track list) plus `gap` / `row-gap` / `column-gap` and `grid-column: span N` on direct children. Anything outside it, including fixed-pixel tracks, `minmax()`, `auto-fill` / `auto-fit`, unequal fractions, and line-number or named-line placement, is ignored with a development warning that names a supported alternative, and the container falls back to a wrapping row. On the web the browser lays out the full grid as written.

A grid container that also declares `container-type` is a container-query container at the same time: descendants can use `@container` rules and `cq*` units against its measured box.
