---
'styled-components': major
---

Mounting the same `createGlobalStyle` component multiple times emits its CSS only once in client and `ServerStyleSheet` rendering, and rendering output stays byte-stable between the two. In Server Components each mount carries its own copy of the CSS, so a loading fallback or an old page that React discards never takes the page's global styles with it.
