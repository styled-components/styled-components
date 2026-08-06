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

## Dynamic re-render hot path

On a cache hit, meaning props and theme are unchanged and this is the most common re-render:

- `shallowEqualContext` costs roughly 0.2us, comparing props by `for..in` against a stored key count.
- Everything else is skipped: `resolveContext`, flatten, hash and `generateName`.
  `buildPropsForElement` still runs.

On a cache miss, meaning props changed:

1. `resolveContext`: object spread plus attrs evaluation.
2. `flatten()` fast path: an inline function call for string-returning interpolations, roughly 0.05us
   each.
3. `dynamicNameCache` lookup: a `Map.get` on the CSS string, O(1), which skips `phash` and
   `generateName` on a hit.
4. `phash()` and `generateName`: only on a `dynamicNameCache` miss, the first time this CSS is seen.
5. `stylis` compile and serialize: only when `hasNameForId` misses, the first injection of this class.
6. `hasNameForId`: a `Map.has`, negligible.

The render cache splits this path in two, and only the miss side runs the style work. Any hook placed
on one side of that split is called on a miss and skipped on a hit, which makes the component emit a
different hook sequence depending on whether its props happened to change. React rejects that outright
(#5788). `memoization.test.tsx` records the hook sequence across both cache states and asserts they
match, so a hook added inside the branch fails there rather than in a consumer's app.

## V8 gotchas

`new Array(n)` creates HOLEY_ELEMENTS arrays, which infect V8 type feedback. A 3.9x regression was
observed in `GroupedTag` from this alone.

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
