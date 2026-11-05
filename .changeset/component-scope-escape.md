---
'styled-components': patch
---

An interpolated value, or a value in a style object, holds `property: value;` declarations or whole `selector { ... }` rules, and it stays inside the block it was written in, in components and in `createGlobalStyle`, including in templates that contain comments.

A statement holding a `}` the value did not open, a `{` it never closes, or a string, paren, or bracket still open at the end of the statement is dropped along with the rest of the value, and development builds warn about it, so a value like `red; } body { background: red }` cannot add a rule outside its block. A value like that in a selector or an at-rule condition drops the whole rule and warns in development, and so does one holding a `;` or a block there, as in `@media ${'screen;'} and (min-width: 1px) { ... }`. A value that opens a selector and ends on a `;` or a `}` is read on its own ahead of the rule, so `${mixin} &:hover { ... }` keeps working when the mixin ends in `;`.

At-rules that state something for the whole page, such as `@font-face`, still apply at the top level when a value holds them.

A rule whose selector or condition does not read as one once it is joined to its parent or rewritten by a plugin is dropped, and development builds warn about it. So is a rule holding text the library reserves for server rendering. A nested selector that would compose to an extremely long selector is dropped too, since a value nesting many selector lists could otherwise use it to stall rendering.

A plugin that rewrites a declaration into one holding a brace or a comment, or leaving a string, paren, or bracket open, loses that declaration, and development builds warn about it. With the `rtl` plugin, a four-value shorthand holding a string or an escape keeps its order, and one written across several lines flips the same as one written on a single line.

In React Server Components, extending a component leaves the text of a `url()` as written, and a selector with a very long run of `+` combinators is adjusted for inline style tags only up to a limit.

When a text value nests blocks thousands of levels deep, the over-deep block is dropped and the rest of the component's styles apply.

Templates with a very large number of comments are processed in time proportional to their length.
