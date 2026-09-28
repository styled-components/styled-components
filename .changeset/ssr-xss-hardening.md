---
'styled-components': patch
---

Server-side output escapes `</style>` substrings (rewritten as the CSS hex escape `\3C/style`, which the CSS engine still parses identically) and HTML-escapes nonce values before they reach the rendered `<style ...>` tag, so user-supplied content interpolated into styles can't break out and inject markup. In-browser style injection is unaffected.

A value interpolated into a declaration, selector, property name, or at-rule condition also can't open or close a CSS rule, in the browser or in server output. A `;` inside a declaration's value still separates declarations of the same rule (`color: ${'red; opacity: 0.5'}` sets both), and a comma in a selector value keeps every listed selector anchored on the component. Values in style objects (`styled.div(p => ({ color: p.$color }))`) and in `keyframes` templates follow the same rules. A value that can't be resolved, such as a plain React component used as a selector, drops its rule instead of widening it. A value with a `{` or `}` outside a string or `url(`, or one that leaves a string, comment, parenthesis, or `url(` unclosed, drops only the declaration or rule it sits in, with a development warning naming it. Interpolations placed on their own line (mixins) are parsed as full CSS, so keep untrusted text out of them.
