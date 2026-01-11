---
"styled-components": patch
---

Fix: Preserve styles after malformed CSS declarations with unbalanced braces

In styled-components v6, if a CSS declaration contained an unbalanced closing brace (e.g., `line-height: ${() => "14px}"}`), stylis would interpret the `}` as closing the rule block, causing all subsequent styles to be ignored.

This fix adds CSS sanitization that:
- Fast path: Returns CSS unchanged if no issues are detected (no performance impact for valid CSS)
- Slow path: When unbalanced braces are detected, removes only the problematic declarations while preserving valid subsequent styles

Example that now works correctly:
```tsx
const Circle = styled.div`
  width: 100px;
  line-height: ${() => "14px}"}; // ⛔️ This malformed line is dropped
  background-color: green; // ✅ This is now preserved (was ignored in v6)
`;
```
