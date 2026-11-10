---
'styled-components': minor
---

React Native: `&:read-only` and `&:read-write` work on iOS and Android. A `TextInput` is `:read-write` while it can be edited: not disabled, not `aria-readonly`, and editable by React Native's own rules (`readOnly` wins over `editable`). A custom component is `:read-write` only when it is not disabled and you pass `readOnly={false}`, or `editable={true}` without `readOnly`. On the web, a `TextInput` given `aria-readonly={false}` stays editable, as on iOS and Android. Every other element is `:read-only`. See https://styled-components.com/docs/compatibility.
