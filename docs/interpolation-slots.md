# Interpolation slots

How a `${...}` slot in a styled template (styled components, `css`, `createGlobalStyle`, `keyframes`) gets its role, and what its value may do in that role. Tests lock each rule.

## Reading the template

- Comments (`/* */` and `//` line comments) are removed first. A slot written inside a comment is removed with it and never evaluated.
- The template is then read once, with each slot as an opaque placeholder, by the same rules as plain CSS. A slot's role comes from its position in that reading.
- In authored template text, a string stays open across a raw newline (a deviation from CSS Syntax 3's bad-string rule, noted beside its test). Slot values get no such tolerance (see Value checks).

## Roles

- Statement start: the first non-whitespace position of a block, or the position after a top-level `;`, `{`, or `}`.
- Statement text: any character at a statement start other than whitespace, `;`, `}`, or another slot.
- Inside: a slot not at a statement start, including inside a string, parentheses, a selector, a value, a property name, an at-rule prelude, or a keyframe stop. Substituted as text.
- Glued: a slot at a statement start followed immediately, with no whitespace, by statement text (`${p}: red`, `${x}-color: red`, `${A}:hover {`, `${A}, h2 {`, `${A}{`). Treated as Inside.
- Run: slots at a statement start separated only by whitespace or nothing (`${a} ${b}`, `${a}${b}`). A Run is classified as a whole by what follows it; its last slot may be Glued.
- Standalone: a Run followed by `;`, `}`, the end of the block, `@`, or a statement that ends in `;`, `}`, or the end of the block (a declaration). Each value is spliced as sibling statements (a mixin).
- Property: a Run followed by `:`, with or without whitespace between, in a statement that ends in `;`, `}`, or the end of the block. The last slot is part of the property name; earlier slots are Standalone.
- `@` ends a Run even with no whitespace before it (`${a}@media ...`): the Run is Standalone.
- Head: a Run followed, after whitespace, by statement text of a statement that ends in `{`. A Run whose last slot is Glued to that text keeps the Glued slot in the selector and resolves the earlier slots as Head.
- Head resolution, per slot front to back, from the realized value text (a css fragment realizes to its filled source text):
  - through the last `;` or `}` outside strings, parentheses, and brackets: statements, spliced before the rule;
  - the remainder, if not whitespace: prefixes the rule's selector;
  - a remainder starting with `@` turns the statement into a conditional group rule when it names `@media`, `@supports`, `@container`, `@layer`, `@scope`, or `@starting-style` (prelude: the rest of the remainder plus the rule's selector text); any other at-keyword drops the statement with a dev warning;
  - a remainder shaped like `name: value` still prefixes the selector, with a dev warning that a mixin before a rule must end in `;`;
  - once a slot contributes a selector or at-rule remainder, every later slot in the Run joins that remainder as text.
  - A Head whose value is a styled component reference is selector text. A Head whose value cannot be resolved (a client reference on the server, a non-styled component) drops the rule with a dev warning rather than widening its selector.
  - Empty following selector text (`${x} { ... }`): the block applies to the parent as `& { ... }` does; at the top level of `createGlobalStyle`, where there is no parent, the block is dropped with a dev warning.
- Missing-`;` recovery: a css fragment interpolated directly (not returned by a function) whose source holds an unescaped `;`, `{`, or `}` outside strings and parentheses, met Inside a declaration (after the statement's top-level `:`) at parenthesis depth 0 whose previous significant item is not `:`, `,`, `(`, or `/`, ends that declaration and becomes Standalone. A preceding slot counts as a value item (recovery applies). Never inside strings or parentheses.
- Keyframes: in a frame list, Glued and Head apply as in a block (`${() => '0%'} { ... }` is a stop); a Run followed by `;`, `}`, `@`, or the end of the list is Standalone and splices frames. A stop Head whose remainder starts with `@` drops the frame with a dev warning; one that resolves to no stops drops the frame. Inside a frame every Run at a statement start is Standalone and splices declarations. A spliced value of the wrong kind (rules inside a frame, declarations in a frame list) is dropped with a dev warning.

## Value shapes

- string: its text. number: its decimal text. `null`, `undefined`, `false`, `true`, `''`: empty.
- function (any number of parameters): called with the render context; its result takes the slot's role.
- array: each element resolved in order and joined (Inside, Glued, Property) or spliced in order (Standalone, keyframe splices).
- css fragment: spliced (Standalone) or realized as text (every other role).
- plain object: converted to declarations (Standalone) or to its own `toString` when it defines one.
- keyframes: its generated name, injected when rendered.
- styled component: its class selector. A non-styled component, or a client reference used where a value is needed, drops that slot with a dev warning.
- One slot never removes the rest of a component's or global style's CSS: a slot that cannot be resolved drops only its own construct.

## Value checks

Every Inside, Glued, Property, and Head-remainder value is checked with CSS Syntax 3 tokenization, starting from the state at its position in the template (inside a string, inside `url(`, parenthesis depth), handling comments, escapes, strings that end at a raw newline, and unquoted `url(` rules:

- It must end in the state it started in (no unclosed string, parenthesis, bracket, comment, or `url(`, no trailing escape).
- It must hold no `{` or `}` anywhere, quoted or not, and no raw newline inside a string.
- Inside a declaration value, a `;` outside strings, parentheses, and brackets splits the realized declaration into several declarations of the same rule; only declarations are kept, and a piece whose name starts with `@` is dropped.
- In a selector, at-rule prelude, keyframe stop, or Head remainder, a `;` outside strings, parentheses, and brackets fails the check (a `;` ends a nested rule, CSS Syntax 3).
- A templated at-rule name or `@keyframes` name must realize to an identifier.
- A value failing a check drops its enclosing declaration, rule, at-rule, or frame, with a dev warning naming the construct.
- After substitution, a selector list or keyframe stop list is split on top-level commas again, so every selector a value adds stays scoped to the component.

## What a value may do

- Inside, Glued, Property: add declarations to its own rule (through the split above). Never create, close, or escape a rule, never add an unscoped selector.
- Standalone, and the statements part of a Head: a mixin, parsed as CSS and spliced; may add declarations, nested rules, and at-rules (`@import`, `@font-face`). Mixins are author CSS and must not carry untrusted text; this includes a slot placed at the head of a rule.
- Nothing a value contains can close the `<style>` element.
