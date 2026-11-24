---
'styled-components': major
---

Definition-order placement of global styles relative to components has been removed in favor of globals-first placement, in client-only apps as well as with server components: every `createGlobalStyle` style sits before every component style, so a component wins a tie with a global whichever was defined first. Server globals sit before client globals, and keyframes sit with the globals of the side that defined them. To let a global win a tie, raise its specificity.
