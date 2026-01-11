---
"styled-components": patch
---

Fix: Line comments (`//`) in multiline CSS declarations no longer cause parsing errors (fixes #5613)

JS-style line comments (`//`) placed after multiline declarations like `calc()` were not being properly stripped, causing CSS parsing issues. Comments are now correctly removed anywhere in the CSS while preserving valid syntax.

**Example that now works:**
```tsx
const Box = styled.div`
  max-height: calc(
    100px + 200px + 300px
  ); // This comment no longer breaks parsing
  background-color: green;
`;
```
