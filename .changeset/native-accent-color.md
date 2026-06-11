---
'styled-components': minor
---

React Native: `accent-color` is supported on every target. Applied to a `styled.Switch`, it tints the on-state surface so the control picks up the value (the closest analog to the behavior on the web of tinting a checked checkbox). Both `<color>` values and `accent-color: auto` are accepted; `auto` resolves to the platform's accent color.

The same color forms apply here as in every other color slot in styled-components: HTML named colors, CSS Color 4 system keywords, hex, modern color functions, and theme tokens.

For wrapping a third-party component (Slider, Checkbox, ProgressBar, etc.) whose tint prop isn't `<Switch>.trackColor`, use the function form of `.attrs(...)` with the AST bridge to forward the resolved value:

```tsx
const ThemedSlider = styled(Slider).attrs<{ thumbTintColor?: string }>((_props, ast) => ({
  thumbTintColor: ast.pop('accentColor'),
}))`
  accent-color: red;
`;
```

`ast.pop('accentColor')` returns the resolved value and removes it from the style bag so it doesn't reach the wrapped component as an unrecognized style key. Cascade-style inheritance from an ancestor `accent-color` declaration down to a descendant `<Switch>` is not implemented in this release; declare `accent-color` on the Switch itself (or use the attrs recipe above when wrapping).
