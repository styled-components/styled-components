# Interpolation slots

How a `${...}` slot in a styled template (styled components, `css`, `createGlobalStyle`, `keyframes`) gets its role, and what its value may do in that role. Tests lock each rule.

## Position

- Least surprise and the widest composition: a value that is valid CSS in its position works as written, including comments, escapes, and `;`-separated declarations.
- Dynamic CSS stays fast: the common value pays only for a cheap presence check; exact reading runs when a value holds a character that needs it. Every reading is linear in the length of the text.
- The text a check reads is the text that is written: no step after a check (comment removal, `&` replacement, trimming, whitespace removal around selector combinators) may change how the text tokenizes; whitespace that separates two tokens which would otherwise join stays.
- A value is dropped only when it would otherwise change structure (open, close, or escape a rule, or add a selector not anchored on the component), and every drop has a dev warning naming the construct.

## Reading the template

- Comments are removed first. `/* */` comments are read as CSS reads them: at any parenthesis depth, outside strings, escapes, and unquoted `url(` text. `//` line comments are removed outside parentheses, strings, and `url(`, and not directly after `:` (so `https://` survives). A slot written inside a comment is removed with it and never evaluated. The same comment reader serves template text, mixin text, and realized selector text.
- A stray `}` at the top level of a block drops the statement that holds it; reading continues with the next statement.
- A space after a comma is kept as written, on web and native alike.
- The template is then read once, with each slot as an opaque placeholder, by the same rules as plain CSS. A slot's role comes from its position in that reading.
- In authored template text, a string stays open across a raw newline (a deviation from CSS Syntax 3's bad-string rule, noted beside its test). A field that holds a slot gets no such tolerance (see Value checks).

## Roles

- Statement start: the first non-whitespace position of a block, or the position after a top-level `;`, `{`, or `}`.
- Statement text: any character at a statement start other than whitespace, `;`, `}`, or another slot.
- Inside: a slot not at a statement start, including inside a string, parentheses, a selector, a value, a property name, an at-rule prelude, or a keyframe stop. Substituted as text.
- Glued: a slot at a statement start followed immediately, with no whitespace, by statement text (`${p}: red`, `${x}-color: red`, `${A}:hover {`, `${A}, h2 {`, `${A}{`). Treated as Inside.
- Run: slots at a statement start separated only by whitespace or nothing (`${a} ${b}`, `${a}${b}`). A Run is classified as a whole by what follows it; its last slot may be Glued.
- Standalone: a Run followed by `;`, `}`, the end of the block, `@`, or a statement that ends in `;`, `}`, or the end of the block (a declaration). Each value is spliced as sibling statements (a mixin).
- Property: a Run followed by `:`, with or without whitespace between, in a statement that ends in `;`, `}`, or the end of the block. The last slot is part of the property name; earlier slots are Standalone. A property name that realizes to text starting with `@` fails the check.
- `@` ends a Run even with no whitespace before it (`${a}@media ...`): the Run is Standalone.
- Head: a Run followed, after whitespace, by statement text of a statement that ends in `{`. A Run whose last slot is Glued to that text keeps the Glued slot in the selector and resolves the earlier slots as Head.
- Head resolution, per slot front to back, from the realized value text (a css fragment realizes to its filled source text):
  - through the last `;` or `}` outside comments, strings, parentheses, and brackets: statements, spliced before the rule;
  - the remainder, if not whitespace: prefixes the rule's selector;
  - a remainder starting with `@` turns the statement into a conditional group rule when it names `@media`, `@supports`, `@container`, `@layer`, `@scope`, or `@starting-style` (prelude: the rest of the remainder plus the rule's selector text); any other at-keyword drops the statement with a dev warning;
  - a remainder shaped like `name: value` still prefixes the selector, with a dev warning that a mixin before a rule must end in `;`;
  - once a slot contributes a selector or at-rule remainder, every later slot in the Run joins that remainder as text.
  - A Head whose value is a styled component reference is selector text. A Head whose value cannot be resolved (a client reference on the server, a non-styled component) drops the rule with a dev warning rather than widening its selector.
  - Empty following selector text (`${x} { ... }`): the block applies to the parent as `& { ... }` does; at the top level of `createGlobalStyle`, where there is no parent, the block is dropped with a dev warning.
- Missing-`;` recovery: a css fragment interpolated directly (not returned by a function) whose source holds an unescaped `;`, `{`, or `}` outside strings and parentheses, met Inside a declaration (after the statement's top-level `:`, in a statement that does not end in `{`) at parenthesis depth 0 whose previous significant item is not `:`, `,`, `(`, or `/`, ends that declaration and becomes Standalone. A preceding slot counts as a value item (recovery applies). Never inside strings or parentheses. Only a css fragment recovers: a fragment is a block of declarations, while a string is a value, so a string's `;` splits the declaration it sits in (`border: 1px solid ${'red; color: blue'}` sets both).
- A `keyframes` template is a frame list read with the same roles and value checks as a frame list inside `@keyframes`; no value in it can close the `@keyframes` block.
- Keyframes: in a frame list, Glued and Head apply as in a block (`${() => '0%'} { ... }` is a stop); a Run followed by `;`, `}`, `@`, or the end of the list is Standalone and splices frames. A stop Head whose remainder starts with `@` drops the frame with a dev warning; one that resolves to no stops drops the frame. Inside a frame every Run at a statement start is Standalone and splices declarations. A spliced value of the wrong kind (rules inside a frame, declarations in a frame list) is dropped with a dev warning.

## Value shapes

- string: its text. number: its decimal text. `null`, `undefined`, `false`, `true`, `''`: empty.
- function (any number of parameters): called with the render context; its result takes the slot's role.
- array: each element resolved in order and joined (Inside, Glued, Property) or spliced in order (Standalone, keyframe splices).
- css fragment: spliced (Standalone) or realized as text (every other role).
- plain object: converted to declarations (Standalone) or to its own `toString` when it defines one. Keys are author CSS (property names and nested selectors); each non-object value is checked as a declaration value (see Value checks), so an object value has exactly the power of `color: ${value}`. A value that reads balanced and holds none of `[`, `]`, `{`, `}`, `/`, or NUL may be written into the template as text, which reads the same. This holds for static objects (`styled.div({...})`) and objects returned by functions. In any role other than Standalone, an object without its own `toString` cannot be resolved. A `keyframes` template names itself from the same declaration text an object value produces, so different objects give different names.
- keyframes: its generated name, injected when rendered. A keyframes named inside a `keyframes` template is named by the same compiler and injected with the keyframes that holds it.
- In a `keyframes` template there is no render context: a function is written as its source text, with a dev warning naming the `keyframes` call.
- styled component: its class selector. A non-styled component, or a client reference (in any role other than Standalone), cannot be resolved.
- A value that cannot be resolved drops its enclosing declaration, rule, at-rule, or frame with a dev warning, as a failed value check does; it is never substituted as empty text (an empty selector part would widen the rule). It never removes the rest of a component's or global style's CSS.

## Value checks

A field is a declaration value, property name, selector, at-rule prelude, keyframe stop, or Head remainder that holds an Inside, Glued, Property, or Head slot. Each field is read once, from its start, with every value substituted, by CSS Syntax 3 tokenization (comments, escapes, strings that end at a raw newline, unquoted `url(` rules). Text split across a slot boundary (`u${'rl(x)'}`, an escaped name before `(`) therefore reads as the browser reads it. A field whose values hold no character the reading depends on skips the reading.

- The field must end balanced: no unclosed string, parenthesis, bracket, comment, or `url(`, and no trailing escape. A field nesting parentheses and brackets more than 15 levels deep fails. A value may close and reopen the string or `url(` it sits in when the field still ends balanced.
- Trimming substituted text (selectors, heads, declaration values, split declarations) never removes a whitespace character directly preceded by an escaping backslash: `x\ ` keeps its escaped space, and `x\` followed by a newline keeps the newline (outside a string that pair is a delimiter, not an escape), so a backslash never reaches the character written after it.
- A `{` or `}` from a value must read as part of a string or `url(` in the field (an SVG data URI or `content: "{"` works); anywhere else it fails. No string in the field may hold a raw newline.
- The field must hold no `url(` in any spelling (any case, escapes decoded, such as `\75rl(`) directly preceded by a code point at or above U+0080: CSS Syntax 3 revisions disagree on whether such a code point continues an identifier, so the value has no single reading.
- Inside a declaration value, a `;` outside strings, parentheses, and brackets splits the realized declaration into several declarations of the same rule; only declarations are kept, and a piece whose name starts with `@` is dropped with a dev warning.
- In a selector, at-rule prelude, keyframe stop, or Head remainder, a `;` outside strings, parentheses, and brackets fails the check (a `;` ends a nested rule, CSS Syntax 3).
- A templated at-rule name or `@keyframes` name must realize to an identifier: ASCII letters, digits, `_`, `-`, and any character at or above U+0080 or NUL (which CSS preprocessing turns into U+FFFD; the same classification applies wherever identifiers are read), not starting with a digit, `-` followed by a digit, or a lone `-`. Escapes are not accepted. At-rule names, `@keyframes` included, match in any ASCII case.
- A value failing a check drops its enclosing declaration, rule, at-rule, or frame, with a dev warning naming the construct.
- In a selector, at-rule prelude, keyframe stop, or Head remainder, comments in the realized text are removed as CSS reads them (at any parenthesis depth, outside strings, escapes, and unquoted `url(`) before the field is read, split, or anchored, so a comment never hides or reveals an `&`. Where removing a comment would join the code points on either side into one token (`u/**/rl(`, `a/**/b`), an empty `/**/` stays in its place, as CSS serialization does; the same holds for comment removal in template text.
- After substitution, a selector list or keyframe stop list is split on top-level commas again. In a selector list that holds a slot, each part is nested under the parent selector unless the part holds `&` outside parentheses, brackets, and strings (`&:hover` and `html &` stay as written; `html :not(&)` and `body:has(&) *` are nested). Every selector a value adds therefore matches only the component or elements inside it, or is anchored on the component through a top-level `&`. At the top level of `createGlobalStyle` there is no parent, and parts stay as written.
- Writing a selector replaces `&` with the parent selector only outside strings and unquoted `url(` text and not after an escaping backslash (`[data-x="&"]` and `\&` keep their `&`). The anchoring decision above and this replacement read `&` the same way. An `&` followed by identifier text joins the parent's last identifier (`&-active` is written `.a-active`, and counts as anchored). In a field holding a slot, an `&` followed by identifier text (escapes included) that ends in `(` fails the check, because joining would turn that text into a different function or `url(` token.

## What a value may do

- Inside, Glued, Property: add declarations to its own rule (through the split above). Never create, close, or escape a rule, never add an unscoped selector.
- Standalone, and the statements part of a Head: a mixin, comment-stripped and parsed as CSS by the same rules as template text and spliced (a statement holding a stray `}` is dropped; an at-rule name ends at whitespace, `;`, `{`, `}`, or `(`, and an at-rule with an empty name is dropped); may add declarations, nested rules, and at-rules (`@import`, `@font-face`). Mixins are author CSS and must not carry untrusted text; this includes a slot placed at the head of a rule.
- Nothing a value contains can close the `<style>` element or forge the server rehydration marker: server output rewrites `*/` followed by a line break inside rule text to `*/ `, and rehydration reads a marker only in the exact shape the server writes.
- A NUL in a value is written as U+FFFD, as CSS preprocessing reads it.
