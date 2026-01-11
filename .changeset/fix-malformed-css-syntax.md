---
"styled-components": patch
---

Fix: Contain invalid CSS syntax to just the affected line

In styled-components v6, invalid CSS syntax could cause all subsequent styles to be ignored. This fix ensures that malformed CSS only affects the specific declaration, not subsequent valid styles.

**Issues fixed:**
1. Unbalanced closing braces (e.g., `line-height: ${() => "14px}"}`) no longer break subsequent styles
2. Line comments (`//`) in multiline declarations like `calc()` are now properly stripped (fixes #5613)

**Implementation:**
- Fast path: Returns CSS unchanged if no issues detected (no performance impact for valid CSS)
- Slow path: Sanitizes CSS by removing only problematic declarations while preserving valid ones
- Line comments are stripped anywhere in the CSS, not just at the start of lines

**Examples that now work correctly:**
```tsx
// Unbalanced brace - only line-height is dropped
const Circle = styled.div`
  width: 100px;
  line-height: ${() => "14px}"}; // ⛔️ Dropped
  background-color: green; // ✅ Preserved
`;

// Line comment in multiline calc() - no longer causes parsing error
const Box = styled.div`
  max-height: calc(
    100px + 200px
  ); // This comment is now properly handled
  background-color: green;
`;
```
