---
'styled-components': patch
---

`@view-transition` and `@position-try` rules are emitted as written, in components and in `createGlobalStyle`, including inside `@media`. The margin boxes inside `@page` (such as `@top-left`) and the feature value blocks inside `@font-feature-values` (such as `@styleset`) are kept with their declarations.
