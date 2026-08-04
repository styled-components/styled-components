---
'styled-components': minor
---

Declaring your own `style` prop type now replaces the built-in one instead of being merged with it. Previously `styled.div<{ style?: { width: number } }>` still accepted any CSS property, because the built-in style type was added after your props. Now your declaration wins, and passing anything it does not allow is an error. Add the shapes you want to accept to your own type if you were relying on the old behavior.

Relatedly, reading the style type back off a component (for example with `React.ComponentProps`) now reports that CSS custom properties are accepted, which matches what was already allowed when rendering.
