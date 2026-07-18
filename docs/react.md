# React 19 Behaviors

React 19 is the v7 peer floor (`react` / `react-dom` `>= 19.0.0`; the repo dev-pins `19.2.3`). This doc records the React 19 behaviors that bite this library's render hot path and its SSR / RSC output. Snapshot: 2026-07-18.

## Ref-as-prop performance

R19 treats `ref` as a regular prop for function components, so the render body can drop `React.forwardRef`. Two allocation / work regressions ride along, both distinct from the hard rule that `hoistNonReactStatics` must not copy React identity markers (`$$typeof` etc., #5672); those are correctness, these are cost, in the same function family.

### Rest-spread in render allocates per render

The direct translation from `forwardRef` destructures `ref` out:

```js
function RenderComp(props) {
  const { ref, ...rest } = props; // fresh object every render, every instance
  return useStyledComponentImpl(WrappedComp, rest, ref);
}
```

`{ ref, ...rest }` copies every other prop into a new object on every render of every mounted instance. 100 styled components re-rendering is 100 throwaway objects per frame. Pass props unchanged, read `ref` by direct access, and skip `ref` in the downstream forwarding loop instead:

```js
function RenderComp(props) {
  return useStyledComponentImpl(WrappedComp, props, props.ref);
}
// in the props-forwarding loop:
if (key === 'ref') continue;
```

Measured on v7: stable-prop re-render path 15.3 M/s → 21.7 M/s (+42%).

### hoistNonReactStatics recurses into Function.prototype

`hoist-non-react-statics` walks `getPrototypeOf(source)` up to `Object.prototype`. A `forwardRef`-exotic component's prototype is falsy or `Object.prototype`, so the walk stops at once. A plain function component (the ref-as-prop default) has `getPrototypeOf(fn) === Function.prototype`, which carries 9 built-in own-props (`length`, `name`, `apply`, `bind`, `call`, `toString`, `constructor`, `arguments`, `caller`). All 9 sit in `KNOWN_STATICS` so none get hoisted, but the walk still iterates and table-checks each on every `styled(Base)` creation. Extend the short-circuit to skip `Function.prototype` as well:

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

Measured on v7: `styled(Base)` extension creation 134 K/s → 163 K/s.

## Output and test-behavior changes

### renderToString stopped encoding CSS characters

R18 over-encoded inside `<style>` text, emitting `:where(.x)&gt;span` for `>`. R19 emits `:where(.x)>span`, since `>`, `'`, and `"` are not special in a CSS text context, so React skips encoding them. This touches SSR and `extractCSS()` output shape. Tests that asserted `&gt;`, `&#x27;`, or related HTML entities inside CSS text need updating to the raw character.

### react-test-renderer requires act()

R19 throws "Can't access .root on unmounted test renderer" unless the create call is wrapped:

```js
import { act } from 'react';
let renderer;
act(() => {
  renderer = TestRenderer.create(<Comp />);
});
renderer.root.findByType(Comp); // ok
```

`update()` and `unmount()` also need wrapping. react-test-renderer is deprecated in R19 and peer-deps `react: ^19.x.y`, so it cannot be downgraded.

### forwardRef removal ripples into type guards

Dropping `forwardRef` changes what a styled component's runtime shape is, so guards keyed on the old exotic-object shape need widening:

- `isStyledComponent` guarded on `typeof target === 'object' && 'styledComponentId' in target`. Plain function components are `typeof === 'function'`, so the guard must accept both or `styled(SomeStyledComp)` loses inheritance detection.
- `isStatelessFunction` matched `typeof === 'function' && !isClass`. Styled components now pass that filter, so `flatten()` called them as interpolations instead of emitting them as selectors. Also exclude anything carrying the `styledComponentId` brand.
- `React.ForwardRefExoticComponent` return types are gone; HOCs wrapping styled components return plain `React.FC<Props>`.

Also removed: `renderToNodeStream` (only `renderToPipeableStream` / `renderToReadableStream` remain), so tests parameterized across streaming APIs must skip the legacy case. `React.FC` no longer types `.defaultProps` (TS2339); runtime still has it for class components.

## RSC :nth-child hazard for injected style tags

Under React Server Components there is no client runtime to manage a stylesheet, so styles inject as real `<style>` elements that land as DOM siblings of the styled elements. Structural pseudo-classes count those tags: `:first-child`, `:last-child`, and `:nth-child()` see indices shifted by the injected `<style>` tags, and rules target the wrong element or nothing. Observable in v6.3+ under the Next.js App Router and any `react-server-dom-*` renderer. This is a distinct structural-pseudo-class hazard from the `:where()` client-path blocker the project already tracks.

Two fixes, in order of preference:

1. Switch to type-filtered pseudos: `:first-of-type`, `:last-of-type`, `:nth-of-type()`. They match by element type, so `<style>` tags (a different type than `div` / `li` / etc.) are not counted. No tooling, works in every browser. Prefer this whenever the intent is "the first button" rather than literally "the first child regardless of type."

2. If real `:nth-child()` counting is needed, rewrite the selector to exclude the library's own style tags with `rscPlugin` from `styled-components/plugins`, passed via the `plugins` prop on `StyleSheetManager` (v6.4 named this `stylisPluginRSC` on the old `stylisPlugins` prop). The rewrite uses CSS Selectors Level 4 `:nth-child(An+B of S)` to count only matching elements.

Browser-support cliff for fix 2: `:nth-child(... of S)` needs Chrome 111+, Firefox 113+, Safari 9+ (caniuse `css-nth-child-of-s`). An unsupported browser reads the whole rule as an invalid selector and drops it, so the styles vanish silently rather than degrade. Opt into the plugin only when the audience clears those versions; otherwise rewrite to `:nth-of-type()` by hand.
