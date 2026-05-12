---
"styled-components": minor
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

The descendant form `${Card} &` matches whenever the styled-component reference appears anywhere up the parent chain. The child form `${Card} > &` only matches when the reference is the immediate styled-component parent. Plain wrappers (`View`, `Text`, host components) between the ancestor and the matched component are transparent to the chain; a styled component in between becomes the new immediate parent, so the child combinator stops firing while descendant still matches.

The same selectors also work on web. As a bonus, a long-standing case where `${Component} { … }` rules placed after another declaration silently dropped the component prefix on the web has been fixed; those rules now correctly target descendants.
