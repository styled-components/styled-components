---
"styled-components": patch
---

Fix: Contain invalid CSS syntax to just the affected line

In styled-components v6, invalid CSS syntax (like unbalanced braces) could cause all subsequent styles to be ignored. This fix ensures that malformed CSS only affects the specific declaration, not subsequent valid styles.

**Example that now works:**
```tsx
const Circle = styled.div`
  width: 100px;
  line-height: ${() => "14px}"}; // ⛔️ This malformed line is dropped
  background-color: green; // ✅ Now preserved (was ignored in v6)
`;
```
