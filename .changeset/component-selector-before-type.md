---
'styled-components': patch
---

An interpolation at the start of a statement is read the way the CSS around it reads:

- A component keeps its place in a selector. `${Child} h2 { ... }`, `${A}, ${B} { ... }`, `${A} ${B} { ... }`, and `${Child} /* note */ { ... }` all target the component, including when a function returns it.
- A value holding an at-rule opens that at-rule, as in `${media.tablet} { ... }`.
- A value holding a selector list scopes every selector in it, as in `${'h1, h2'} { ... }`.
- A value holding a selector stays part of the selector after it, as in `${'h2'} .x { ... }` and `${'a:hover'} .x { ... }`. A value spaced like a declaration applies as one, as in `${'color: red'} .x { ... }`.
- A value with no space after its colon cannot be told from `a:hover`. It applies as a declaration before a type selector or a component, as in `${'color:red'} h1 { ... }`, and reads as a selector before a class, id, attribute, or `*`, as in `${'a:hover'} .x { ... }`. End a mixin with `;` to apply it everywhere, since babel-plugin-styled-components removes the space from a `css` mixin. Write `a:hover h1` as one value to read it as a selector everywhere.
- A value holding a comment before a rule applies as statements, so write a selector value with no comment in it.
- A mixin that follows a comment applies its styles.
- A selector written against a component stays part of it, as in `${Child}.x { ... }`.
- A selector list whose values all come out empty, as in `${false}, ${false} { ... }`, writes nothing and warns in development.

An interpolation inside a string or `url()` is substituted as text, as in `content: "a;${x}"`.

In `createGlobalStyle`, a mixin with no `;` before a class selector keeps the rest of the global style.

On React Native, a combinator selector, `:nth-child(... of ...)`, an attribute selector's case flag, and an `@container` name can be written with a newline or tab between their parts. See https://styled-components.com/docs/compatibility for the selectors React Native supports.
