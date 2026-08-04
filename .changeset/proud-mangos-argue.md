---
'styled-components': minor
---

Declaring your own `style` prop type now constrains the fields you name while leaving the rest of CSS alone. Previously a declaration like `styled.div<{ style?: { width: number } }>` was quietly ignored, because the built-in style type was applied after your props, so any CSS value was still accepted. Now `width` has to be a number, while `color`, custom properties, and everything else you did not mention keep working as before.

To remove a field rather than constrain it, declare it as `never`. To make your type the only thing accepted, wrap it in the new `CustomStyle` helper, which removes every field you did not list:

```tsx
const Box = styled.div<{ style?: CustomStyle<{ width: number }> }>``;
```

Relatedly, reading the style type back off a component (for example with `React.ComponentProps`) now reports that CSS custom properties are accepted, which matches what was already allowed when rendering.
