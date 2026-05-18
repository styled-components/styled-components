---
'styled-components': minor
---

React Native: descendant and child combinator selectors now work across styled components.

```jsx
const Card = styled.View`
  padding: 16px;
`;
const Title = styled.Text`
  font-size: 14px;
  ${Card} & {
    font-size: 18px;
  }
`;

<Card>
  <Title>Bigger inside a Card</Title>
</Card>
<Title>Default size when standalone</Title>
```

The descendant form `${Card} &` matches whenever the component is rendered anywhere inside `Card`. The child form `${Card} > &` only matches when `Card` is the nearest styled parent. Regular React Native components can sit between styled components without breaking selector matching.

The same selectors also work on web. This also fixes a web bug where `${Component} { ... }` rules placed after another declaration could lose the component selector and target too broadly.
