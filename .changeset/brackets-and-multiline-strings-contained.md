---
'styled-components': patch
---

Malformed CSS stays inside the statement that holds it, so a typo or an interpolated value cannot consume or inject other rules in the stylesheet.

A statement a browser would read past its own end is dropped, along with everything after it in the template, and development builds log a warning naming it. These are:

- a `[` that never closes, as in `&[data-open { color: red; }`
- a closer inside a block it cannot close, as in `f({)` or `[)`
- a paren that never closes straight after an at-rule name, as in `@media(min-width: 1px {`
- a `/*` a browser reads as an open comment, as in `top: //*;`
- text ending in an unpaired backslash
- a string with a raw line break in it, which browsers end at the line break
- a backslash after unescaped whitespace in an unquoted url, as in `url(a \))`, which browsers already reject

An interpolated value that leaves one of these open loses only the statement holding it and keeps what follows it in the template, as in `p: q; ${value} r: s;`.

A complete bracket is one value, matching browsers, so `--areas: [a;b]; color: red;` keeps both declarations. A selector value holding a comma, as in `${'.b, .c'} { top: 0; }`, scopes each selector in it. An at-rule whose name cannot start an identifier, such as a bare `@`, is dropped, matching browsers.

A string continued with a backslash before a line break is unaffected in a template. In an interpolated value, a backslash before a CR LF line break drops the string.

A function whose name holds a backslash escape, as in `\75 rl(...)`, might mean `url(`, which reads its contents differently. It works as written when it holds a plain value or a single quoted string. Any other quote, a bracket, a comment, or a nested paren or brace drops it, which in rare cases is stricter than a browser. The same applies to `url(` straight after `&`, as in `&url(...)`, because `&` is part of the name only in a selector.
