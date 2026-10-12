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

R19 emits `:where(.x)>span` inside `<style>` text, since `>`, `'`, and `"` are not special in a CSS text context. This shapes SSR and `extractCSS()` output. Tests assert the raw character inside CSS text, never `&gt;`, `&#x27;`, or related HTML entities.

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

## RSC :nth-child hazard for injected style tags

Under React Server Components there is no client runtime to manage a stylesheet, so styles inject as real `<style>` elements that land as DOM siblings of the styled elements. Structural pseudo-classes count those tags: `:first-child`, `:last-child`, and `:nth-child()` see indices shifted by the injected `<style>` tags, and rules target the wrong element or nothing. Observable under the Next.js App Router and any `react-server-dom-*` renderer.

Two fixes, in order of preference:

1. Switch to type-filtered pseudos: `:first-of-type`, `:last-of-type`, `:nth-of-type()`. They match by element type, so `<style>` tags (a different type than `div` / `li` / etc.) are not counted. No tooling, works in every browser. Prefer this whenever the intent is "the first button" rather than literally "the first child regardless of type."

2. If real `:nth-child()` counting is needed, rewrite the selector to exclude the library's own style tags with `rscPlugin` from `styled-components/plugins`, passed via the `plugins` prop on `StyleSheetManager`. The rewrite uses CSS Selectors Level 4 `:nth-child(An+B of S)` to count only matching elements.

Browser-support cliff for fix 2: `:nth-child(... of S)` needs Chrome 111+, Firefox 113+, Safari 9+ (caniuse `css-nth-child-of-s`). An unsupported browser reads the whole rule as an invalid selector and drops it, so the styles vanish silently rather than degrade. Opt into the plugin only when the audience clears those versions; otherwise rewrite to `:nth-of-type()` by hand.

## RSC style emission and Suspense

Every server-rendered instance emits its own inline `<style data-styled>` holding exactly the rules its render needs: its own class, each base level, and any keyframes it references. Global styles from `createGlobalStyle` do the same. Nothing is skipped because an earlier instance in the request already emitted it.

### Why there is no per-request ledger

`React.cache` is request-wide, with no scope per Suspense boundary. A ledger that records emitted rules loses the only copy whenever the first instance renders inside a Suspense fallback: the resolved instance skips its rules, and React's reveal script deletes the fallback's DOM, style included, leaving the resolved element with a class and no rule (#5808). Global styles hit the same hazard three ways:

- A fallback and the resolved content both render the global: the fallback's tag wins the ledger and disappears on reveal.
- A synchronous fallback never reaches the HTML at all, so the global is missing even with JavaScript disabled.
- An async layout and its page both render the global: the page wins the ledger, and a client navigation to a sibling page removes the only tag while the layout that needs it never re-renders.

The stylesheet's name registry lives on one sheet shared by every request in the process, reset when a request starts, so a claim fails whenever an earlier instance or a concurrent request registered the name first. Emission therefore reads each name's compiled rules from a process-wide cache keyed by component and name, never from the claim result. Caching across requests is safe because a name's rules are fixed: the name hashes the CSS and the stylis configuration. A later request reuses a cached name's rules without recompiling. The cache per component holds the same number of names as the component's other dynamic-name caches; a name evicted mid-request is recompiled when an instance needs it.

### Why not `precedence`

React Float only takes over a `<style>` carrying both `precedence` and `href`; a plain one renders as an ordinary host element with its attributes intact, and the client renders the same element from the server-component payload, so it hydrates without a mismatch. `precedence` would dedup and survive a reveal, but it fails four ways:

- Bucket order: Float inserts a new bucket after the last `[data-precedence]` node, or at `head.firstChild` when none exists, so server-component styles land ahead of the client registry and an RSC extension of a client component loses to its base (#5672).
- Permanence: a precedence style is a resource that never unmounts (#5641, #5649, #5670).
- Attribute loss: when Fizz merges a style into a bucket it keeps only `children`, so `data-styled` is dropped on the server too.
- Position: `rscPlugin`'s child-index rewrite depends on the tag staying an inline sibling.

### Cost of the repeats

- DOM: Chromium style recalculation measured 1.0 ms versus 1.5 ms at 1000 identical tags, 4.6 ms versus 7.3 ms at 5000; linear.
- Server render time: every repeat renders and escapes its own `<style>` host element, so render time grows with the instance count. The cost is inherent to one tag per instance; skipping the CSS build on a shared-element hit does not recover it.
- HTML: within gzip's 32 KB window a repeat costs about a byte; farther apart, roughly the gzipped size of the CSS. Brotli's larger window keeps repeats cheap at any distance.
- Server-component payload: every emission site reuses one `<style>` element object per key from a request-scoped `React.cache` Map, keyed on the component ID plus what fixes its CSS (different CSS, components, or `StyleSheetManager` settings never share; the React key stays fixed per component). Styled components key on the generated class string, whose hash folds in each level's CSS and the stylis configuration, so a hit skips building the CSS; the component ID keeps an extension with no rules of its own from sharing its base's element. `createGlobalStyle` keys on the exact CSS text and returns the element wrapped in an array, because Flight references a repeated element whole only inside an array (a bare returned element repeats its type and key). React 19's Flight serializer writes each repeat as a path reference such as `"$0:props:children:0"`, about 15 characters per nesting level. No size threshold applies: measured on a production Next.js 16 app (React 19.2), references ran 22 to 104 characters, always shorter than the smallest style element (129 bytes), and sharing everything was smallest or within 3 bytes in 15 of 16 compressed measurements. HTML and final DOM are byte-identical with and without sharing, and each instance still renders its own tag, so a reveal never strands an element.

A development-only warning fires once one component emits `RSC_REDUNDANT_EMIT_WARN_THRESHOLD` tags in a render, pointing very large lists at styling items from one styled parent.
