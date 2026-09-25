# Runtime Performance

Measured patterns, engine gotchas and the shape of the hot path. Every entry here was validated by
microbenchmark against the realistic workload, not a synthetic best case.

## Validated patterns

| Pattern | Result |
|---------|--------|
| String `+=` vs `array.push()+join()` | `+=` is 3-4x faster at all scales (V8 cons string trees) |
| Object creation | `{...props, theme}` is 4x faster than `Object.assign` or `for..in` copy |
| Props iteration | `for..in` is 1.7x faster than `Object.keys()` + loop |
| RegExp creation | Cache via Map is 5x faster; `indexOf` pre-check to skip entirely is 5x more |
| Template literals | Manual `+` concat is 1.3x faster than `` `${a}${b}` `` in tight loops |
| `React.createElement` | Raw element objects measure 60-120x faster, but are NOT used on this branch: `StyledComponent` calls React's own `createElement`. Measurement only, not an inventory entry |

## Dynamic render hot path

Interpolations and attr functions run on every render. They are the component's own render-body user
code, so a hook called inside an interpolation (React `useContext` from an `@mui/styled-engine-sc`
adapter, for example) is one of the component's hooks and must run every render like any other hook
site. Skipping evaluation on a props-equal re-render would drop that hook and serve a stale class name
whenever an interpolation reads state outside props and theme (#5788).

The pure work downstream of the produced CSS string is memoized, so a repeat render that yields the
same CSS is cheap:

1. `resolveContext`: object spread plus attrs evaluation.
2. Interpolation fast path: an inline function call for string-returning interpolations that bypasses
   `flatten`'s type dispatch and array allocation, roughly 0.05us each.
3. `dynamicNameCache` lookup: a `Map.get` on the CSS string (prefixed by the stylis plugin hash when
   one is set), O(1), which skips `phash` and `generateName` on a hit.
4. `phash()` and `generateName`: only on a `dynamicNameCache` miss, the first time this CSS is seen.
5. `stylis` compile and serialize: only when `hasNameForId` misses, the first injection of this class.
6. `hasNameForId`: a `Map.has`, negligible.

A props-equal re-render bailout belongs at the component boundary via `React.memo`, which only the
caller can key against the full set of inputs the styles depend on. `memoization.test.tsx` records the
hook sequence across a re-render with unchanged props and asserts it matches the mount, so a change
that reintroduces skipped evaluation fails there rather than in a consumer's app. The native path is
the same: `InlineStyle` caches CSS-to-style-object by content, so `generateStyleObject` returns a
stable reference for equal styles without an outer render cache.

## V8 gotchas

`new Array(n)` creates HOLEY_ELEMENTS arrays, which infect V8 type feedback. A 3.9x regression was
observed in `GroupedTag` from this alone.

Never `delete` a key from the render context object (`resolveContext` in `StyledComponent.ts` and
`StyledNativeComponent.ts`). Removing a key mid-object flips it to V8 dictionary mode, which slows
every subsequent `for..in` read of that object for the rest of the render, including
`buildPropsForElement`'s. Assign `undefined` instead (stable shape, no mode transition), and track
which keys should end up absent from the forwarded props in a separate list rather than by actually
removing them. Measured: an attrs function clearing a real, ever-changing caller-supplied prop every
render costs about 1.34x versus the assign-and-track version, at 1,000 children cycling colors
(`attrs render-path guardrails` in `src/bench/web.test.js`).

A helper that reads `process.env.NODE_ENV` (`isTag`, for example) must not be called more than once
per render for the same input. Unbundled Node and Jest read `process.env` at runtime rather than
having it replaced at build time, so a second call doubles that cost for no benefit. Compute it once
and pass the result along (a plain boolean loses the call's type-narrowing, so re-narrow at any site
that still needs the original predicate). Measured: calling `isTag` once instead of twice per render
(the class/className site reusing the buildPropsForElement value) costs about 1.09x on an explicit
`undefined` prop forwarded to a DOM tag; a component target sees no measurable difference, since
`isTag` short-circuits on `typeof target === 'string'` before ever reading `process.env` for a
non-string target.

The `private` modifier is not allowed on anonymous class expressions
(`export const Foo = class { ... }`).

`import type * from 'stream'` still triggers bundler module resolution even though TypeScript strips
it.

## Stylis AST

`stylis.compile()` gives a rule nested inside an at-rule the *same* `props` array object as its
enclosing scope. In stylis's parser the nested `ruleset()` call is handed the parent's `rules` array
as its `props` argument, and that array is stored on the node unchanged, so the two nodes share one
array rather than holding equal copies.

Verified on stylis 4.3.6: compiling `.a, .b { color: red; @media (min-width: 1px) { color: blue; } }`
yields two `rule` nodes whose `props` are the identical object, and assigning to `props[0]` on the
nested node changes the top-level node's selector too.

So never mutate `rule.props` in place; allocate a replacement array, as `recursivelySetNamespace`
does. `rule.value` is a plain string and is safe to reassign.

That namespacing walk also skips `@keyframes` children when it recurses, since keyframe selectors
(`from`, `0%`) are offsets rather than selectors and must not be prefixed.

Character code constants live in `src/utils/charCodes.ts`. Import from there rather than redefining
local copies.
