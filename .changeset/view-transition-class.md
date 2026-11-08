---
'styled-components': minor
---

View transition styles can target a styled component directly. A component that sets `view-transition-name` gets its own class as `view-transition-class`, so a rule in `createGlobalStyle` can name the component inside a view transition pseudo-element:

```tsx
const Card = styled.li`
  view-transition-name: match-element;
`;

const Transitions = createGlobalStyle`
  ::view-transition-group(*${Card}) {
    animation-duration: 400ms;
  }
`;
```

The class follows a name set on the component's own element in any state or media condition, not one set on a descendant. A `view-transition-class` written in a component's styles is kept as written. An extension of `Card` matches the rules written for `Card`. One that sets its own `view-transition-name` also matches its own rules, and gets the automatic class unless it writes a `view-transition-class` too.

`view-transition-class: ${Card}` and `container-name: ${Card}` emit the component's class name, which browsers accept, so a component can be listed beside other names. An extension that sets its own `container-type` keeps matching `@container ${Base}` queries, unless it writes its own `container-name`. On React Native, including React Native for Web, an extension's container answers only queries that name the extension itself; see https://styled-components.com/docs/compatibility.

CSS snapshots of components that set `view-transition-name` include the added `view-transition-class` declaration.
