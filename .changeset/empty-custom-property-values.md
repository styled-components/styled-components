---
"styled-components": patch
---

Empty CSS custom property values are now preserved.

`--my-prop: ;` is a legitimate CSS declaration — the empty value is part of the Custom Properties spec and is used by patterns like scroll-driven animations as a "guaranteed-invalid" sentinel. Previously these declarations were silently dropped from the rendered output, which broke setups like:

```css
@keyframes shadow-toggle {
  from, to { --shadow: ; }
}
```

They now render as authored. Empty values for non-custom properties (e.g. `color: ;`) continue to be dropped — those are still invalid CSS.
