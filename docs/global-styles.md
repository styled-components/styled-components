# GlobalStyle Shared-Group Architecture

Every component returned by a single `createGlobalStyle` call shares one stylesheet group, registered
at call time via `StyleSheet.registerId(componentId)`. The returned component is wrapped in
`React.memo`.

## Instance identity

Each mount needs its own instance ID, allocated by `allocateGSInstance`. The server allocates
directly, since a server render is one-shot. The client allocates through a `useRef` so the ID stays
stable across re-renders.

`instanceRules`, a `Map<number, { name: string; rules: string[] }>` on the module-level `GlobalStyle`
object, tracks each mount's compiled CSS. `computeRules()` flattens and compiles the CSS and caches it
there under the name `componentId + instance`, making `instanceRules` the single source of truth for a
rebuild.

`rebuildGroup()` clears the shared group and re-inserts from the surviving instances. It is O(N) in
mounted instances, which is typically one to three.

## Static and dynamic rules take different paths

`renderStyles` branches on `isStatic`, and the two branches share almost nothing.

Static rules never rebuild. The branch checks `hasNameForId(id, id + instance)` and inserts only on a
miss. On a hit it still calls `computeRules` when `instanceRules` has no entry for the instance: that
is the rehydration case, where the CSS is already in the DOM from the server but the module-level
cache is empty, and populating it is what lets `rebuildGroup` restore this instance if a sibling
unmounts later.

Dynamic rules recompute on every render, then compare. `computeRules` overwrites the entry first, so
the comparison is against the previous entry captured beforehand; if the rule arrays are the same
length and element-wise equal, the CSSOM rebuild is skipped. That fast path is client-only
(`!styleSheet.server`): server-side `clearTag()` invalidates the DOM tag and not the module-level
caches, so a cache-based fast path would skip a rebuild the DOM still needs. Any new fast path here
must make the same check.

Server-side `instanceRules` entries must be deleted explicitly once styles are collected, because no
`useLayoutEffect` cleanup runs on the server.

`rebuildGroup` must run synchronously. Nothing may yield between `clearRules` and the re-insert loop,
or the group is observable while empty.

## Client lifecycle

The client uses two separate `useLayoutEffect`s:

1. One runs `renderStyles` on render and on dependency change.
2. A second holds the `removeStyles` cleanup, keyed on `[instance, sheet, globalStyle]`, so cleanup
   fires only on unmount, sheet swap or HMR.

Collapsing these into a single effect with per-render cleanup wipes `instanceRules` before the
rules-equality fast path can hit, which costs a double `rebuildGroup` on every render of every
dynamic global style (#5730).
