---
'styled-components': minor
---

React Native: pseudo-classes chain on iOS and Android, such as `&:active:not(:disabled)` or `&:hover:enabled`. A chained rule applies only when every part matches, and `:not()` of a single pseudo-class inverts it. A chain can start with an attribute or position selector, such as `&[aria-pressed='true']:hover:not(:disabled)`, and `:not()` of an attribute can follow a pseudo-class or an attribute, such as `&:hover:not([data-busy])`. On iOS and Android, `:not()` of an attribute after a position selector (`&:first-child:hover:not([data-busy])`) and `:not()` of a class (`&:hover:not(.icon)`) are skipped with a development warning, since native elements have no class names. In a selector list such as `&:hover, & .icon`, each selector is judged on its own: the supported ones apply and the rest are skipped, with a development warning outside `@media`, `@container` and `@supports`. See https://styled-components.com/docs/compatibility.
