---
'styled-components': minor
---

React Native: the `@property` rule is supported. Custom properties can be registered with a typed syntax, an initial value, and an inheritance switch: an unset registered property resolves `var()` references to its typed initial value, and `inherits: false` registrations stop ancestor values from leaking into descendants. Invalid rules (missing descriptors, initial values that don't match the declared syntax) are ignored with a development warning, matching the spec. On the web, registrations forward to the browser's own `CSS.registerProperty()`.
