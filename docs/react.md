# React 19 Behaviors

React 19 is the v7 peer floor (`react` / `react-dom` `>= 19.0.0`; the repo dev-pins `19.2.3`). This doc records the React 19 behaviors that bite this library's render hot path and its SSR / RSC output. Snapshot: 2026-07-18.

## Ref-as-prop performance

R19 treats `ref` as a regular prop for function components, so the render body can drop `React.forwardRef`. Two allocation / work regressions ride along, both distinct from the hard rule that `hoistNonReactStatics` must not copy React identity markers (`$$typeof` etc., #5672); those are correctness, these are cost, in the same function family.

### Rest-spread in render allocates per render

The direct translation from `forwardRef` destructures `ref` out:

```js
function RenderInner(props) {
  const { ref, ...rest } = props; // fresh object every render, every instance
  return useImpl(WrappedStyledComponent, rest, ref);
}
```

`{ ref, ...rest }` copies every other prop into a new object on every render of every mounted instance. 100 styled components re-rendering is 100 throwaway objects per frame. Pass props unchanged, read `ref` by direct access, and skip `ref` in the downstream forwarding loop instead:

```js
function RenderInner(props) {
  return useImpl(WrappedStyledComponent, props, props.ref);
}
// in the props-forwarding loop (buildPropsForElement):
if (key === 'ref') continue;
```

### hoistNonReactStatics recurses into Function.prototype

`hoist-non-react-statics` walks `getPrototypeOf(source)` up to `Object.prototype`. A `forwardRef`-exotic component's prototype is falsy or `Object.prototype`, so the walk stops at once. A plain function component (the ref-as-prop default) has `getPrototypeOf(fn) === Function.prototype`, which carries 9 built-in own-props (`length`, `name`, `apply`, `bind`, `call`, `toString`, `constructor`, `arguments`, `caller`). Six of them are excluded by the `KNOWN_STATICS` check (`constructor` and `toString` only because the `in` check sees `Object.prototype`); `apply`, `bind`, `call`, and `Symbol.hasInstance` would be copied onto the new component, and the walk would table-check every key on each `styled(Base)` creation. The short-circuit therefore skips `Function.prototype` as well as `Object.prototype`:

```js
const functionPrototype = Function.prototype;
if (
  inheritedComponent &&
  inheritedComponent !== objectPrototype &&
  inheritedComponent !== functionPrototype
) {
  hoist(target, inheritedComponent, excludelist);
}
```

## Commit phases without effects

The mechanism behind the effect ban in AGENTS.md (React 19.2, `react-dom` development build):

- A ref callback's detach runs in the mutation phase and its attach in the layout phase, both synchronous and before paint; `useEffect` cleanup runs after paint. Moving a teardown from effect cleanup to ref cleanup moves it earlier, which changes what a sibling observes for one frame.
- When a ref callback returns a function, React runs that cleanup on detach instead of calling the ref with `null`.
- A ref callback returning a non-function is ignored with no runtime diagnostic; only the `@types/react` return type catches some cases.
- React re-arms a ref whenever its identity changes, so an inline arrow re-runs cleanup then setup on every render: the semantics of `useEffect(fn)` with no dependency array. A timer or subscription armed that way restarts every render; it needs a frozen callback identity, which is what `useComposedRef` provides.

## Output and test-behavior changes

### renderToString does not encode CSS characters

R19 emits `.x>span` inside `<style>` text, since `>`, `'`, and `"` are not special in a CSS text context. This shapes SSR and `extractCSS()` output. Tests assert the raw character inside CSS text, never `&gt;`, `&#x27;`, or related HTML entities.

### react-test-renderer requires act()

R19 throws "Can't access .root on unmounted test renderer" unless the create call is wrapped. The native suite's `src/test/native-setup.ts` wraps `create`, `update`, and `unmount` globally; anywhere else, wrap by hand:

```js
import { act } from 'react';
let renderer;
act(() => {
  renderer = TestRenderer.create(<Comp />);
});
renderer.root.findByType(Comp); // ok
```

`update()` and `unmount()` also need wrapping. react-test-renderer is deprecated in R19 and peer-deps `react: ^19.x.y`, so it cannot be downgraded.

### Runtime shape of a styled component

A styled component has no `forwardRef` wrapper; it is a memo-shaped object around a plain render function. A guard that detects one must accept both `typeof target === 'object'` and `'function'` with the `styledComponentId` brand, as `isStyledComponent` does, or `styled(SomeStyledComp)` loses inheritance detection. Code that treats functions as interpolations must exclude anything carrying that brand so a styled component is emitted as a selector. The public `PolymorphicComponent` type still extends `React.ForwardRefExoticComponent`.

R19 has no `renderToNodeStream` (only `renderToPipeableStream` / `renderToReadableStream`), so tests parameterized across streaming APIs skip the legacy case. `React.FC` does not type `.defaultProps` (TS2339); runtime still has it for class components.

### Probes outside Jest: the act environment

Jest sets `global.IS_REACT_ACT_ENVIRONMENT`; an ad-hoc script does not. Without it, `TestRenderer.create` can return silently inverted results instead of throwing: probing ref attach/detach ordering showed no attach on mount and a phantom attach on update, the opposite of the truth, with only a deprecation banner and "not configured to support act(...)" messages as warning. Set the flag and wrap in `act` in any probe script. (Observed with React 19.2, 2026-08.)

`TestRenderer.create()` gives a concurrent root, so `update()` outside `act` enqueues and never flushes; a benchmark loop over it completes, reports plausible numbers, and measures nothing. Drive benchmarks through a `flushSync`-driven react-dom root, and include a control that must separate from the empty case: a control that does not separate means the instrument is broken. Inside `act()`, every update in the callback is batched, so per-event measurement needs one `act()` per event.

### Raw element snapshots

R19 elements carry `$$typeof: Symbol(react.transitional.element)` plus internal `_owner` / `_store` props, so an inline snapshot of a raw element array is unstable. Render to a string (or a DOM) before snapshotting.

## StyleSheetManager and configureServerStyles in server components

Server components have no context, and Flight does not render in tree order:

- Once a row has serialized past a size threshold, Flight defers its remaining elements to a later task, so they render after their later siblings. The Flight suite's deferral case locks the behavior on the pinned React version.
- An async server component's output renders in a later task; tasks that resume together render in one batch.

So nothing keyed on time scopes a manager: a per-request slot, restore sentinels after the children, and `AsyncLocalStorage` all reach the wrong components on a real page.

### Scope by position

- A manager returns its children rewritten: each server component element becomes an element of a per-type wrapper carrying the scope; host, symbol (Fragment, Suspense) and client-reference elements are rebuilt around their rewritten contents (children, Suspense `fallback`, every client-reference prop).
- A wrapper sets the scope for the synchronous call into its component, then rewrites that component's output with the same scope; an async component's output is rewritten when it resolves.
- An element whose type is already a wrapper is left alone: the nearest manager wins.
- Outputs are rewritten, function-component props are not, so an element takes the scope of the place it renders, as context does on the client.
- Every scope reader (`useStyleSheetContext`, the server `StyleSheetContext.Consumer`) runs synchronously inside a wrapper. A read after an `await` in a user component sees the server defaults.
- Thenables stay thenables in every position (a client component may `use()` a promise prop). The rewrite is memoized per manager render and marks each container as in progress before descending into it, so cyclic props and reused element objects resolve to one result.
- With no manager in the tree nothing is rewritten.

### Boundaries

- A manager in a Next.js layout styles only the layout's own markup: the layout's `children` is a router placeholder and the page travels as a separate branch of the payload.
- `"use cache"` output renders in its own Flight render and sees the server defaults.
- Client components take their settings from a client `StyleSheetManager` (the registry), never from a server one.

### configureServerStyles

- `configureServerStyles({ namespace, plugins })` sets the namespace and plugins every server component starts from, for the whole process. A manager inherits them like a nested manager inherits its parent's; `plugins={[]}` and `namespace=""` opt out. Namespace semantics: [namespace.md](namespace.md).
- Stored on `globalThis` under a `Symbol.for` key that names the major version, and shape-checked on read, so every copy of the library in the process reads one value (Next bundles each server layer apart).
- Last call wins. A call applies to renders that start after it, so it is a top-level statement in a module every server render loads first: in Next, the root layout file. Next runs `instrumentation.ts` only in the live server, never in the build workers that prerender static pages, so a call there misses every prerendered route.
- One value per process: an app with several root layouts (route groups) makes one call, or each layout's call replaces the others' for every route.
- Server components only: a process-wide value would differ between server rendering and the browser for client components.

## Client references in server styles

A `'use client'` export reaches a server component as a client reference, and a value a server action received from the client as a temporary reference. Neither carries a class on the server, and reading most properties of one throws (a module export and a temporary reference throw on almost any read; the module proxy object mints a new reference per read).

- Check an interpolated value for a reference before any other read or call of it; `$$typeof` is the one property every reference reads safely. The check is `isServerOpaqueReference` in `utils/serverReference.ts`.
- An interpolation that is or returns one stands for a server-only marker string. The node holding the marker drops before emit: a selector-list item (the rule when none is left), an at-rule or keyframes block whose name or prelude holds it, a keyframes stop (the frame when none is left), or a declaration, including one inside a keyframes frame. A standalone slot joined into the next rule's head drops only the item it joins. A dropped node never widens a selector, and a dropped `view-transition-class` or `container-name` counts as unwritten.
- The drop follows the forgiving selector-list model (an invalid item is removed, the list stays), not the browser's unforgiving style-rule rule, which would discard the whole rule.
- Every interpolation still evaluates; only the emitted CSS loses the node.
- Server components only (`CAN_HOLD_REFERENCE` in `utils/serverReference.ts`): references exist only under the `react-server` condition, so plain server rendering of a client tree skips every check, and native has no server components (`docs/react-native.md` "RSC on native").

## Server component styles

Server component styles reach the page only through a style registry (a `ServerStyleSheet` reachable through `StyleSheetManager`, as in the FAQ's Next.js recipe). No server component renders a `<style>`, so `& + &`, child-index selectors and SVG children see only the author's elements.

### Transport

1. RSC graph: a styled render returns `Fragment(ScStyle, element)`; a `createGlobalStyle` render returns `ScGlobalStyle`. Neither touches a sheet.
2. SSR graph: each renders as a client component and, in render, registers ids, places groups, inserts missing rules and learns edges in the registry sheet.
3. Registry flush: `<style data-styled>` tags with markers, before `</head>` and before each later chunk.
4. Browser: rehydration and late adoption read the tags; each `ScStyle` and `ScGlobalStyle` inserts and learns in its insertion effect.

- A server styled instance renders `Fragment(ScStyle, element)`, `ScStyle` first, keyed `sc-<componentId>`; the element carries the full class string. `ScStyle` props: `chain` (`[componentId, name, rules[], seq][]`, base first), `keyframes` (`[id, name, rules[]][]`), `outers` (`componentId[]`). `ScGlobalStyle` props: `id`, `keyframes`, `rules`, `seq`. Both render `null`.
- Each level keeps its own generated name and group, as on the client.
- `ScStyle` and `ScGlobalStyle` are `@internal` exports of the package entry (`index.ts`, never `base.ts`, so the standalone build carries neither). The `styled-components/server-styles` subpath re-exports them from a `'use client'` module, so the SSR and browser graphs each reach them through one instance of the package and its `mainSheet`. The server build imports the subpath by name and keeps it external; the browser, rn-web and native builds never import it. See [bundling.md](bundling.md).
- Wire prop names cross from the server bundle to the browser bundle, which terser mangles apart, so none is on the mangle list.
- Every instance renders its own `ScStyle` ("Why there is no per-request ledger"). Element objects are shared per request on component id, generated names and the `outers` signature, so Flight writes repeated props once.
- `generateId` salts ids under `IS_RSC`, so a generated RSC-graph id never equals an SSR or browser id. Build-plugin, global and keyframes ids are shared across graphs; a shared group takes its key from its first arrival in each sheet.

### Keys and placement

Each sheet owns an `Order`: the group positions (output order), each group's key, edges, contested pairs and refused edges. Group numbers are local identifiers; `outputSheet`, `extractCSS` and CSSOM offsets follow positions.

- Key order: server globals, client globals, server components, client components; each tier by seq (its graph's definition order). Keyframes take their graph's global tier.
  - Server seq: the RSC-graph group number, carried in props and markers. Client seq: the SSR-graph number on a server sheet; on a browser sheet, the marker's number for a group that arrived in a server tag, else the browser number.
- Default placement: a group with no edge goes right after the positioned group with the greatest position among those with a smaller key.
- Flush-aware placement: on a server sheet that has flushed, a component group also goes after the last flushed group, so positions equal HTML order. A global keeps key placement and pays a suffix re-emit ("Streaming").
- Edges (wrapper after wrapped) override keys. `learn(outer, inner)` skips a self edge and a settled pair (stored, refused, or contested); stores the edge; moves `outer` and every transitive outer positioned at or before `inner` to just after `inner`, keeping their relative order. A CSSOM move reads the group's rules, deletes its range and reinserts it.
- Pins: a chain level's edge to its base is learned before any other edge touches the level (its first edge or first insert), base first. A pin never closes a cycle and never meets a contested pair.

### Learning edges

- Client scan, every styled render with a non-empty `className`: each token found in the group register that is not one of the component's own chain ids is an outer. Results are cached per `className` string in a bounded FIFO stamped with a register version that bumps on each new id.
  - Every build but the server build: each instance also remembers its last `className`, register version and outers in a ref, so a list with more distinct strings than the FIFO holds skips the scan while its strings stay put. The memo holds only the scan result; settledness is always asked of the current sheet.
  - Server sheet: `learn` in render.
  - Browser: a read-only `isSettled` check in render; an unsettled outer mounts `StyleInjector` with `outers`, and its insertion effect learns. `useImpl`'s hook sequence is the same on every render, whatever the scan finds.
- RSC scan: the same against the RSC graph's register; hits travel as `outers`. Covers `as={X}`, plain intermediates, nested server wrappers, hand-passed `className`, and a `"use cache"` component that receives `className`.
- `ScStyle` registers its chain ids in render, before its element renders, so a same-pass inner sees a server outer the browser never saw.
- Only a server component can wrap a client one: a client module cannot import a server component, and server `children` never receive a client parent's `className`.

### Cycles

Two components that wrap each other in both directions close a cycle.

- A cycle through pinned edges only: refuse the new edge; nothing is contested.
- Otherwise: refuse the new edge, drop the learned edges on the cycle's paths, and contest every pair of its members that no pinned-only path orders. Contest order is key order, kept where a pin inside the cycle runs against keys. Pairs apply in contest order: the second member moves after the first with its carry set (its transitive outers and contested partners).
- While `contested` is non-empty, a learned edge that would order a contested pair, directly or through a path, or whose move would carry a pair's first member past its second, is refused.
- Every refused learned edge is recorded so no injector retries it. Development warns once per contested pair and once per refused edge, naming both components.
- Contested pairs last as long as the sheet's `Order`: one request on a server sheet; until a non-server `clearTag()` in the browser.

### Streaming

- A server sheet keeps names, `Order` and the rules already flushed across `clearTag()`.
- A later flush walks positions. Seeds: groups with new rules, plus the inner of each edge learned between two flushed groups and the first member of each pair contested between two flushed groups. Re-emit set: for each seed, every flushed group after it that is its transitive outer, a contested partner, or a global; with any global in play, every flushed group after the earliest one. Keyframes never seed or join it.
- A re-emitted group writes all its rules as one block marked full. Globals sit before every component, so only a global first rendered in a late boundary causes a suffix re-emit.
- Two groups share an element only through an edge chain or a contested pair, except globals, so the re-emit set restores HTML order for every pair on an element already visible.
- A rule that reaches another element (`& > *`, `& + div`) can tie with that element's own component with no edge between them; flush-aware placement keeps their order equal to first-render order. That holds for a full page load only: a client navigation streams a payload, not HTML, so the browser places such a pair by key (definition order). The sandbox's `late-child-selector` page records it with `hardLoadOnly`.

### Markers and the browser

- Markers keep `data-styled.g<number>[id="..."]`, so the forged-marker guard still drops imitations, and add optional server seq and full-block fields that hold no `"`. `MARKER_RE` reads one explicit optional group per field (no lazy quantifier); old markers still parse. Tier comes from the seq field and the id prefix (`sc-global-` or a keyframes id): seq and global id, server global; global id alone, client global; seq alone, server; neither, client.
- `adoptGroupForId` maps a marker to a browser number: the id's existing number, else the marker's number if free, else a fresh one. The allocator pointer never moves.
- Blocks in document order: an unpositioned group appends at the first rehydration; in late adoption a global takes key placement and a component group appends; a full block moves its group and carry set to the end. A block whose marker names are all registered inserts nothing; otherwise its whole block appends to the group (a rule is not linked to its name). No block removes or replaces a rule.
- Late adoption: while `document.readyState === 'loading'`, the first sheet write in each microtask adopts unadopted server tags (`querySelectorAll`), and one final pass runs on `DOMContentLoaded`. Adopted tags are removed, except a tag whose next element sibling is neither another server tag nor the end of `body`: removing one between hydratable siblings breaks hydration (error #418). A kept tag is emptied, since a live copy later in the page would outrank rules the sheet adds after adoption; the two-graph harness tests in `rscStream.test.tsx` hydrate with kept tags and no recoverable error.
- `ScStyle`'s browser half inserts with key `(server, seq)` and learns chain and `outers` edges in its insertion effect; component rules stay after unmount. `ScGlobalStyle` removes its instance's rules on unmount. A browser `reconstructWithOptions` sheet starts with a copy of its parent's `Order`.

### Registry reach

- A `StyleSheetManager` with `target` or `nonce` under a server sheet keeps the parent sheet during SSR, so its styles flush through the registry's tag with the registry's nonce; both apply in the browser. A `sheet` prop still replaces the sheet.
- No registry, or outside it (a styled `<html>` or `<body>` around it, a sibling of it, `global-error.tsx`, which Next renders only in the browser): SSR inserts nothing and development warns once, naming the registry recipe and a second copy of the library as causes. Styles apply when each `ScStyle` mounts.
- The registry can wrap `<html>` in the root layout.
- Supported hosts: Next.js with webpack or Turbopack; Vite with `@vitejs/plugin-rsc` with the registry in the SSR entry. `styled-components` in Next's `serverExternalPackages` is unsupported (Turbopack fails the render; webpack ignores it).
- Partial prerender: the resume renders with a fresh registry sheet, so it repeats rules the prelude sent. Hydrated, all-registered blocks are skipped; with JavaScript off, a prelude element whose inner the resume repeats can lose that tie.
- Cascade layers: a move can change layer order when the moved group holds a layer's first appearance. An up-front `@layer a, b;` in a global fixes it; development warns when a move changes first-appearance order.

### Why there is no per-request ledger

`React.cache` is request-wide, with no scope per Suspense boundary. A ledger that records emitted rules loses the only copy whenever the first instance renders inside a Suspense fallback: the resolved instance skips its rules, and React's reveal script deletes the fallback's DOM, style included, leaving the resolved element with a class and no rule (#5808). Global styles hit the same hazard three ways:

- A fallback and the resolved content both render the global: the fallback's tag wins the ledger and disappears on reveal.
- A synchronous fallback never reaches the HTML at all, so the global is missing even with JavaScript disabled.
- An async layout and its page both render the global: the page wins the ledger, and a client navigation to a sibling page removes the only tag while the layout that needs it never re-renders.

The registry sheet's name dedupe is not that ledger: rules enter the request sheet in render and never leave it during the request, and the registry writes its tags where React never removes them (head, or before a chunk). A Suspense attempt that is discarded, retried or switched to client rendering leaves extra rules, never missing ones.

The RSC graph's name registry lives on one sheet shared by every request in the process, reset when a request starts, so a claim fails whenever an earlier instance or a concurrent request registered the name first. `ScStyle` props therefore carry each name's compiled rules from a process-wide cache keyed by component and name, never from the claim result. Caching across requests is safe because a name's rules are fixed: the name hashes the CSS and the stylis configuration. The cache per component holds the same number of names as the component's other dynamic-name caches; a name evicted mid-request is recompiled when an instance needs it.

### Why not `precedence`

React Float only takes over a `<style>` carrying both `precedence` and `href`; a plain one renders as an ordinary host element with its attributes intact, and the client renders the same element from the server-component payload, so it hydrates without a mismatch. `precedence` would dedup and survive a reveal, but it fails three ways:

- Bucket order: Float inserts a new bucket after the last `[data-precedence]` node, or at `head.firstChild` when none exists, so server-component styles land ahead of the client registry and an RSC extension of a client component loses to its base (#5672).
- Permanence: a precedence style is a resource that never unmounts (#5641, #5649, #5670).
- Attribute loss: when Fizz merges a style into a bucket it keeps only `children`, so `data-styled` is dropped on the server too.

### Costs

- Server-component payload: React 19's Flight serializer writes a repeated element object as a path reference such as `"$0:props:children:0"`, about 15 characters per nesting level, so shared `ScStyle` elements cost a reference per repeat. `createGlobalStyle` returns its `ScGlobalStyle` element wrapped in an array, because Flight references a repeated element whole only inside an array.
- Browser: one hydrated fiber and one insertion effect per server instance.
- Late adoption's query, per 1,000 late boundaries: about 9 ms of main-thread time in two of the three major browser engines; the third grows quadratically, about 2 ms at 100 boundaries and about 235 ms at 1,000. A `MutationObserver` measured linear everywhere but slower than the query in the first two.
