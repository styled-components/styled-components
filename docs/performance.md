# Performance

## Performance Patterns (microbenchmark-validated)

- String `+=` is 3-4x faster than `array.push() + join()` at all scales (V8 cons string trees)
- `{...props, theme}` is 4x faster than `Object.assign` or `for..in` copy
- `for..in` is 1.7x faster than `Object.keys()` + loop
- Cache RegExps via Map (5x faster); `indexOf` pre-check to skip entirely is 5x more
- Manual `+` concat is 1.3x faster than `` `${a}${b}` `` template literals in tight loops
- `new Array(n)` creates HOLEY_ELEMENTS arrays that infect V8 type feedback

## V8 Gotchas

- `private` modifier is not allowed on anonymous class expressions (`export const Foo = class { ... }`)
- `import type * from 'stream'` still triggers bundler module resolution even though TypeScript strips it
