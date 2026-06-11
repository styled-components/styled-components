---
'styled-components': patch
---

Empty CSS custom property values are preserved.

`--my-prop: ;` is a legitimate CSS declaration; the empty value is part of the Custom Properties spec and is used by patterns like scroll-driven animations as a "guaranteed-invalid" sentinel. It renders as authored:

```css
@keyframes shadow-toggle {
  from,
  to {
    --shadow: ;
  }
}
```

Empty values for non-custom properties (e.g. `color: ;`) are dropped, since those are invalid CSS.

Note: components that author `--prop: ;` get a new class name on upgrade since the emitted CSS includes the declaration. Typical apps are unaffected.
