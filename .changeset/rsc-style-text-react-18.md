---
'styled-components': patch
---

Server component styles keep child combinators (`>`), quotes, and ampersands as written on Next.js 13.5 and 14, whose bundled React 18.3 canary HTML-escaped them inside the inline `<style>` tag (for example `.a &gt; .b`), so the browser dropped those rules on first load. A style value still cannot close the `<style>` tag. Next.js 15 and later were not affected and render the same output as before.
