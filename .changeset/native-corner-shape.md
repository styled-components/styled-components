---
'styled-components': minor
---

React Native: the `corner-shape` property is supported. `round` renders iOS's circular corner curve and `squircle` (along with nearby `superellipse()` values) renders the Apple-smooth continuous curve. Contours React Native can't draw (`bevel`, `notch`, `scoop`, `square`, far-out superellipse values, and corners that mix shapes) drop with a development warning suggesting `round` or `squircle`. Android renders circular corners and warns that the curve only takes effect on iOS. On the web the value passes through to browsers that support it.

```js
const Card = styled.View`
  border-radius: 16px;
  corner-shape: squircle;
`;
```
