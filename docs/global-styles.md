# Global styles: the shared group

Every mount of a `createGlobalStyle` component with the same `componentId` shares one stylesheet group, registered when the global is defined (`StyleSheet.registerId`). The id hashes `JSON.stringify(rules)`, where a function serializes to `null` or, in a style object, is left out, so separate calls that differ only in their functions share an id and a group. Ids stay content-derived, so they match between server and client bundles; the registry below is what keeps each call's CSS.

## Registry

- Lives in `WebGlobalStyle.ts`: `WeakMap<StyleSheet, Map<componentId, Map<instance, { keyframes, name, placement?, rules }>>>`. One entry per mount, whichever `WebGlobalStyle` object produced it. A rebuild reads only the registry.
- Keyed by sheet first: each sheet owns its own tag, and a per-request sheet's entries are collected with it.
- `instance` is the mount's `React.useId()`.
- Names: a dynamic entry is `componentId + instance`. A static entry is `componentId` alone, because same-id static globals have identical CSS (no functions), so a rebuild inserts the first static entry only. The name alone tells a write which path an entry takes. Values that serialize alike but print differently, such as `NaN` and `Infinity`, break that assumption and the first one wins.
- An id's map is deleted with its last instance. Each write resolves the per-sheet, per-id map once and reuses it.

## Rebuild order

- `rebuildGroup()` clears the group and re-inserts every surviving entry for the id on that sheet, synchronously (nothing may yield between the clear and the re-insert).
- Every insert of a global's rules, a rebuild's included, passes the entry's `placement`: a server global's first write in the browser can be a rebuild, and a group keeps the key of its first insert until a browser sheet's `clearTag()` resets its order.
- Order: mount order, the registry map's insertion order, so the most recent mount wins a same-property conflict. A mount adds its entry at the end; an update replaces the entry in place, so a prop or theme change never moves a global. A global that unmounts and mounts again goes to the end. On first render this matches tree order, because globals render nothing and their effects fire in tree order. Every global sits before every component, server globals before client globals; globals of one tier follow definition order (see [react.md](react.md) "Server component styles").

## Static and dynamic paths

- Every render that can write computes the entry (`computeRules`). Interpolations are the component's render body: they may call hooks or read values outside props and theme, so skipping them on such a render breaks the hook sequence or serves stale styles. Computing writes nothing, so a render React throws away leaves no trace on the sheet. A static global holds no function, in a nested `css` or a style object (`isStaticRules`), so an instance with a registered entry reuses it. A server-build render with no server sheet can never write, so it returns before computing.
- Writing (`renderStyles`) happens at commit on the client and during render on a server sheet, always with the entry that render computed. Referenced keyframes are written first, so they sort ahead in the sheet.
- Static: inserts once per sheet (`hasNameForId(id, id)`); on a hit with no entry for the instance (rehydration, or a sibling mount) it records the entry so a later rebuild can restore it. A repeat write for a registered instance returns at once.
- Dynamic: compares the new entry against the one recorded for the instance. Equal rules skip the rebuild, on the client only (`!styleSheet.server`). Any new fast path must make the same check.

## Server

- No cleanup effect runs on the server. A server sheet's entries stay until the sheet itself is collected (the registry is keyed by sheet, and a server sheet lives for one request), so a rebuild there sees every instance.
- An RSC render writes nothing to a sheet: it renders `ScGlobalStyle` with the instance's rules and keyframes, and that client component writes them into the registry sheet in SSR and into the browser sheet on mount, through the registry above, under the `server global` tier. It writes every instance as dynamic (`componentId + instance`), so each instance holds its own copy and an instance React throws away, such as a Suspense fallback, takes only its copy with it. See [react.md](react.md) "Server component styles".
- An instance's first render into a server sheet appends: a rebuild would re-emit siblings' rules that a stream already flushed (`clearTag` empties the tag after each chunk but keeps the names). A repeat render of the same instance (a client re-render against a server sheet, or a second render into one collection) rebuilds, so its earlier rules are replaced and its siblings' rules stay.
- Only a sheet constructed with `isServer: true` (`ServerStyleSheet`, or a sheet derived from one) takes this path. The process-wide default sheet is never a server sheet, even on a server: `StyleSheet` reads `server` from its constructor argument, not from its defaults.

## Client lifecycle

- Two `useInsertionEffect`s: one writes the render's entry, keyed on `[instance, entry, sheet, globalStyle]`, so it runs on every commit of a dynamic global (each render makes a new entry) and only on mount, sheet swap or HMR for a static one (a re-render reuses the registered entry); the other only holds the `removeStyles` cleanup, keyed on `[instance, sheet, globalStyle]`, so it fires on unmount, sheet swap or HMR. One effect with per-render cleanup would delete the entry before the equal-rules fast path could hit, rebuilding twice per render of every dynamic global (#5730).
- HMR swaps in a new `WebGlobalStyle` under the same id. React runs an updated fiber's insertion-effect cleanups before its insertion-effect bodies, so the old object's `removeStyles` has already deleted the entry and rebuilt the group when the write effect runs with the new object.
- `React.memo` is the only bailout: a parent re-render with equal props skips the component, and with it the interpolations.
