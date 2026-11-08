# StyleSheetManager namespace

`namespace` scopes every emitted selector under one ancestor so an embedded app's styles stay inside its container.

## Placement model

- Every top-level selector-list item gets `<ns> ` in front (`#app .c`), which matches when the namespace element is the root or any ancestor.
- An item anchored at the document root (`html ...`, `:root ...`) cannot match through a descendant prefix, because the root is never inside itself. With a joinable namespace, the namespace is joined onto that root compound instead, right after the root name (`html#app.dark .c`, `:root#app`, `html#app::view-transition-old(root)`), so the item matches when the namespace element is `<html>`. Simple selectors in a compound match in any order; only a type selector must lead and a pseudo-element must end it, so no further scan of the compound is needed. With the namespace on a container, those items match nothing, so an embedded app never styles its host page's root.
- A bare `::view-transition*` item (or `*::view-transition*`, whose `*` is dropped since a universal selector only opens a compound) takes `:is(<ns>,<ns> *)` in front: a document transition with the namespace on the root, and an element-scoped transition rooted on or inside the namespace element.
- Specificity is unchanged by the join; cascade order is unchanged.
- Joinable: once trimmed, one compound starting with `#`, `.`, `[` or `:`, with no unescaped whitespace, comma or combinator outside a group or string, and no pseudo-element, decided once per namespace (`.a\ b` is one compound and joins). Any other namespace keeps the plain prefix on every item.
- A namespace ending in a hex escape (`.a\31`) keeps one whitespace after the escape in both the joined and the prefixed form, since that whitespace ends the escape and is not a combinator: `html.a\31 .dark .c`, `.a\31  .x`.
- Only an item whose text starts with `html`, `:root` or a bare `::view-transition*` joins. A root name inside a group (`:where(html.dark) &`, `:is(:root) &`), at any specificity, keeps the plain prefix and matches nothing in the root placement.
- `:host` forms under a shadow-root `target` keep the plain prefix.
- Judging a namespace and reading each item stay linear in their length.
- Test rows: `emit-web.test.ts`.

## Inheritance

- A nested `StyleSheetManager` uses its own `namespace` when given, else its parent's, on the client and server paths. `namespace=""` clears an inherited one. An unset namespace is stored as undefined.
- The namespace feeds the class hash, so a component under a nested manager that inherits a namespace gets a different class than one that does not.

## configureServerStyles

- `configureServerStyles({ namespace, plugins })` sets both process-wide starting values for server components; both are optional and a call replaces both (a later call with only `plugins` clears the namespace).
- Server components only: client components take the namespace from a client `StyleSheetManager` with the same value, which yields the same class for a shared component.
- Holder storage, call placement and the one-value-per-process rule: [react.md](react.md) "configureServerStyles".
