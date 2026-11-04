# Performance

## Performance Patterns (microbenchmark-validated)

- String `+=` is 3-4x faster than `array.push() + join()` at all scales (V8 cons string trees)
- `{...props, theme}` is 4x faster than `Object.assign` or `for..in` copy
- `for..in` is 1.7x faster than `Object.keys()` + loop
- Cache RegExps via Map (5x faster); `indexOf` pre-check to skip entirely is 5x more
- Manual `+` concat is 1.3x faster than `` `${a}${b}` `` template literals in tight loops
- `new Array(n)` creates HOLEY_ELEMENTS arrays that infect V8 type feedback

## Minifier Gotchas

- Terser inlines a helper called from one place as a function expression rebuilt on every call; on a per-node path that measured 1.6x slower (the RSC scope walk's rows workload). Consumers re-minify `dist`, so measure a hot path after a second pass too (bundler-style module wrap, then default terser and Next's SWC minifier)
- `/*#__NOINLINE__*/` only survives that second pass at a call that stays in expression position: on a call right after `return`, terser prints the comment before the `return`, where the next minifier no longer sees it. Prefer a structure that leaves nothing to inline (a real second caller, or the check written out in place)

## V8 Gotchas

- `private` modifier is not allowed on anonymous class expressions (`export const Foo = class { ... }`)
- `import type * from 'stream'` still triggers bundler module resolution even though TypeScript strips it
