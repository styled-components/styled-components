---
'styled-components': patch
---

Fix a component whose props are a union losing its member-specific props when wrapped in `styled()`. Since 6.5.0, `styled(Pressable)` where `Pressable` accepts `ButtonHTMLAttributes | AnchorHTMLAttributes` rejected `href` at the JSX call site, accepting only the props common to every member of the union.
