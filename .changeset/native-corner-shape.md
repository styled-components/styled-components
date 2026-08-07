---
'styled-components': minor
---

React Native: the `corner-shape` property is supported, at the fidelity each value can actually be drawn.

`round` maps to iOS's circular corner curve, which is React Native's own default, so it renders exactly on every platform. `square` applies a zero radius to the corners it names, since the spec defines `square` as the shape `border-radius: 0` already draws, so it is also exact, and it is the only `corner-shape` value Android renders. Because `square` resolves per corner rather than to the single per-view `borderCurve`, it can be mixed with one curve: `corner-shape: square round` squares the top-left and bottom-right and leaves the other two rounded.

`squircle` (and nearby `superellipse()` values) maps to Apple's continuous curve, which is an approximation rather than a match. Measured on iOS 26, `continuous` moves the outline by under 1% of the element's side at any radius, roughly an eighth as far as the exponent-4 superellipse the spec asks for, so it looks close to `round`. Android drops `borderCurve` altogether and warns.

Concave and bevelled contours (`bevel`, `notch`, `scoop`, far-out `superellipse()` values) cannot be drawn and drop with a development warning, leaving the initial `round`. Two different curves on different corners also drop, since `borderCurve` applies to the whole view. On the web the value passes through to browsers that support it.

```js
const Card = styled.View`
  border-radius: 16px;
  corner-shape: square round;
`;
```
