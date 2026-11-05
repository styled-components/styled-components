---
'styled-components': patch
---

A few smaller styling fixes:

- An object with no prototype, as from `Object.create(null)`, works as a style object.
- `${false} & + & { ... }` targets the same elements as `& + & { ... }`.
- On the web, a component's automatic `container-name` reads `container-type` and `container-name` written in a `&` block, so `& { container-name: sidebar; }` keeps your name. On React Native, write `container-type` outside a `&` block. See https://styled-components.com/docs/compatibility for the selectors React Native supports.
- A `createGlobalStyle` rendered in a server component includes the keyframes it references.
