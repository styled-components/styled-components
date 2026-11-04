# Global styles: the shared group

Every mount of a `createGlobalStyle` component with the same `componentId` shares one stylesheet group, registered when the global is defined (`StyleSheet.registerId`). The id hashes `JSON.stringify(rules)`, and functions serialize to `null`, so separate calls that differ only in their functions share an id and a group. Ids stay content-derived, so they match between server and client bundles; the registry below is what keeps each call's CSS.

## Registry

- Lives in `WebGlobalStyle.ts`: `WeakMap<StyleSheet, Map<componentId, Map<instance, { name, rules }>>>`. One entry per mount, whichever `WebGlobalStyle` object produced it. A rebuild reads only the registry.
- Keyed by sheet first: each sheet owns its own tag, and a per-request sheet's entries are collected with it.
- `instance` is the mount's `React.useId()`.
- Names: a dynamic entry is `componentId + instance`. A static entry is `componentId` alone, because same-id static globals have identical CSS (no functions), so a rebuild inserts the first static entry only.
- An id's map is deleted with its last instance. Each render resolves the per-sheet, per-id map once and reuses it.

## Rebuild order

- `rebuildGroup()` clears the group and re-inserts every surviving entry for the id on that sheet, synchronously (nothing may yield between the clear and the re-insert).
- Order: mount order, the registry map's insertion order, so the most recent mount wins a same-property conflict. A mount adds its entry at the end; an update replaces the entry in place, so a prop or theme change never moves a global. A global that unmounts and mounts again goes to the end. On first render this matches tree order, because globals render nothing and their effects fire in tree order. Globals with distinct ids are ordered by their groups, which are registered at definition.

## Static and dynamic paths

- Static: inserts once per sheet (`hasNameForId(id, id)`); on a hit with no entry for the instance (rehydration, or a sibling mount) it still computes the entry so a later rebuild can restore it.
- Dynamic: recomputes on every render, then compares against the entry captured before the recompute. Equal rules skip the rebuild, on the client only (`!styleSheet.server`). Any new fast path must make the same check.

## Server

- No cleanup effect runs on the server. A server sheet's entries stay until the sheet itself is collected (the registry is keyed by sheet, and a server sheet lives for one request), so a rebuild there sees every instance.
- RSC renders into the process-wide default sheet, so the RSC branch deletes each entry right after reading it; one tag per instance, see [react.md](react.md) "RSC style emission and Suspense".
- An instance's first render into a server sheet appends: a rebuild would re-emit siblings' rules that a stream already flushed (`clearTag` empties the tag after each chunk but keeps the names). A repeat render of the same instance (a client re-render against a server sheet, or a second render into one collection) rebuilds, so its earlier rules are replaced and its siblings' rules stay.
- Only a sheet constructed with `isServer: true` (`ServerStyleSheet`, or a sheet derived from one) takes this path. The process-wide default sheet is never a server sheet, even on a server: `StyleSheet` reads `server` from its constructor argument, not from its defaults.

## Client lifecycle

- Two `useInsertionEffect`s: one renders on mount and on dependency change; the other only holds the `removeStyles` cleanup, keyed on `[instance, sheet, globalStyle]`, so it fires on unmount, sheet swap or HMR. One effect with per-render cleanup would delete the entry before the equal-rules fast path could hit, rebuilding twice per render of every dynamic global (#5730).
- HMR swaps in a new `WebGlobalStyle` under the same id. React runs an updated fiber's insertion-effect cleanups before its insertion-effect bodies, so the old object's `removeStyles` has already deleted the entry and rebuilt the group when the render effect re-runs with the new object.
