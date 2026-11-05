# GlobalStyle Shared-Group Architecture

Every mount with the same `componentId` shares one stylesheet group, registered at call time via
`StyleSheet.registerId(componentId)`. The returned component is wrapped in `React.memo`.

The id hashes `JSON.stringify(rules)`, and functions serialize to `null`, so separate
`createGlobalStyle` calls that differ only in their functions share an id and a group. Ids stay
content-derived (stable across server and client); the shared registry below is what keeps each
call's CSS.

## Instance identity

Each mount needs its own instance ID, allocated by `allocateGSInstance` from the sheet it renders
into. The server allocates directly, since a server render is one-shot. The client keeps the ID in a
`useRef` so it stays stable across re-renders, and allocates a fresh one from the new sheet when the
`StyleSheetManager` sheet changes: independent sheets count from 1, so a kept ID would collide with
one the new sheet hands out.

A module-level registry in `GlobalStyle.ts`,
`WeakMap<StyleSheet, Map<componentId, Map<instance, { name, rules }>>>`, tracks each mount's
compiled CSS, whichever `GlobalStyle` object produced it. It is keyed by sheet first because each
sheet owns its own tag and instance counter; a per-request sheet's entries are collected with it.
`computeRules()` flattens and compiles the CSS and stores it under the name `componentId + instance`,
making the registry the single source of truth for a rebuild. An id's map is deleted with its last
instance. Each render resolves the per-sheet, per-id map once and reuses it.

`rebuildGroup()` clears the shared group and re-inserts every surviving instance for the id on that
sheet, in mount order (the map's insertion order), so the most recent mount wins a same-property
conflict. A mount adds its entry at the end; an update replaces the entry in place, so a prop or
theme change never moves a global. A global that unmounts and mounts again goes to the end. On first
render this matches tree order, because globals render nothing and their effects fire in tree order.
Globals with distinct ids are ordered by their groups, which are registered at definition. It is O(N)
in mounted instances, which is typically one to three.

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

No `useLayoutEffect` cleanup runs on the server. A server sheet's entries stay until the sheet
itself is collected (the registry is keyed by sheet, and a server sheet lives for one request), so a
rebuild there sees every instance. RSC renders into the process-wide default sheet, so the RSC
branch deletes each entry right after reading it.

An instance's first render into a server sheet appends: a rebuild would re-emit siblings' rules that
a stream already flushed (`clearTag` empties the tag after each chunk but keeps the names). A repeat
render of the same instance (a client re-render against a server sheet) rebuilds, so its earlier
rules are replaced and its siblings' rules stay.

Only a sheet constructed with `isServer: true` (`ServerStyleSheet`, or a sheet derived from one)
takes this path. The process-wide default sheet is never a server sheet, even on a server:
`StyleSheet` reads `server` from its constructor argument, not from its defaults.

HMR swaps in a new `GlobalStyle` object under the same id. The cleanup-only effect depends on
`globalStyle`, and React runs an updated layout effect's cleanup before any layout effect body, so
the old object's `removeStyles` has already deleted the instance's entry and rebuilt the group when
the render effect re-runs with the new object.

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
