# GlobalStyle Shared-Group Architecture

Every mount with the same `componentId` shares one stylesheet group, registered at call time via
`StyleSheet.registerId(componentId)`. The returned component is wrapped in `React.memo`.

The id hashes `JSON.stringify(rules)`, and functions serialize to `null`, so separate
`createGlobalStyle` calls that differ only in their functions share an id and a group. Ids stay
content-derived (stable across server and client); the shared registry below is what keeps each
call's CSS.

## Instance identity

Each mount needs its own instance ID, allocated by `allocateGSInstance`. The server allocates
directly, since a server render is one-shot. The client allocates through a `useRef` so the ID stays
stable across re-renders.

A module-level registry in `GlobalStyle.ts`,
`WeakMap<StyleSheet, Map<componentId, Map<instance, { name, rules }>>>`, tracks each mount's compiled
CSS, whichever `GlobalStyle` object produced it. It is keyed by sheet first because each sheet owns
its own tag, and independent sheets count instances from 1. `computeRules()` flattens and compiles
the CSS and stores it under the name `componentId + instance`, making the registry the single source
of truth for a rebuild. An id's map is deleted with its last instance.

`rebuildGroup()` clears the shared group and re-inserts every surviving instance for the id on that
sheet. It is O(N) in mounted instances, which is typically one to three.

## Static and dynamic rules take different paths

`renderStyles` branches on `isStatic`, and the two branches share almost nothing.

Static rules never rebuild. The branch checks `hasNameForId(id, id + instance)` and inserts only on a
miss. On a hit it still calls `computeRules` when the registry has no entry for the instance: that
is the rehydration case, where the CSS is already in the DOM from the server but the module-level
cache is empty, and populating it is what lets `rebuildGroup` restore this instance if a sibling
unmounts later.

Dynamic rules recompute on every render, then compare. `computeRules` overwrites the entry first, so
the comparison is against the previous entry captured beforehand; if the rule arrays are the same
length and element-wise equal, the CSSOM rebuild is skipped. That fast path is client-only
(`!styleSheet.server`): server-side `clearTag()` invalidates the DOM tag and not the module-level
caches, so a cache-based fast path would skip a rebuild the DOM still needs. Any new fast path here
must make the same check.

Server-side registry entries must be deleted explicitly once styles are collected, because no
`useLayoutEffect` cleanup runs on the server. Because each server instance's entry is deleted right
after its render, a first-seen server instance appends its rules instead of rebuilding; a rebuild
would drop every earlier instance's output.

HMR swaps in a new `GlobalStyle` object under the same id, so the client path calls `removeStyles`
for the instance before re-rendering; otherwise the instance's surviving entry would let the
rules-equality fast path skip the re-insert.

`rebuildGroup` must run synchronously. Nothing may yield between `clearRules` and the re-insert loop,
or the group is observable while empty.

RSC emission (each server-rendered instance gets its own tag, no dedup) is covered under
"Per-instance emission" in [docs/rsc-style-injection.md](rsc-style-injection.md).

## Client lifecycle

The client uses two separate `useLayoutEffect`s:

1. One runs `renderStyles` on render and on dependency change.
2. A second holds the `removeStyles` cleanup, keyed on `[instance, sheet, globalStyle]`, so cleanup
   fires only on unmount, sheet swap or HMR.

Collapsing these into a single effect with per-render cleanup wipes the instance's entry before the
rules-equality fast path can hit, which costs a double `rebuildGroup` on every render of every
dynamic global style (#5730).
