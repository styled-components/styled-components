---
'styled-components': patch
---

Fixed server component styles applying in the wrong order when React streams `<style>` tags out of tree order. An extension's styles win over the styles it extends, and styles passed through a wrapper component (`styled(Card)` where `Card` renders a styled element) win over that element's own styles, whichever tag the browser reads last. Several variants of one component apply in the order they render.

Inherited rules carry the same specificity in server component output as in client and `ServerStyleSheet` output, so a page styles the same way whichever renders it. `${Base}` selectors keep matching every extension of `Base`.

Two cases are not ordered: a wrapper and the element it renders on opposite sides of a `"use cache"` boundary, where the inner element's styles win ties, and a server component extended by a client component.
