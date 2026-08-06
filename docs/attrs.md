# attrs Behavior

`attrs` always wins over a directly passed prop. This is by design, not a precedence accident.

The function form is the escape hatch when a caller's value should win:

```js
.attrs(({ as }) => ({ as: as || 'button' }))
```

One exception to attrs winning: explicitly passing `undefined` for a prop prevents attrs from
overwriting it, which is how a caller signals intent to reset the value (#5683).
