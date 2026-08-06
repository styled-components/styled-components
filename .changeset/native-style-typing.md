---
'styled-components': minor
---

React Native `style` props are checked against React Native's own style types. The CSS-custom-property widening the web entry applies was reaching the native entry too, so web-only CSS and custom properties were accepted on native components that cannot render them.
