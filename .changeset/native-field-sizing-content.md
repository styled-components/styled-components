---
'styled-components': minor
---

React Native: `field-sizing: content` makes a `TextInput` autosize to its content.

```jsx
const Note = styled.TextInput`
  field-sizing: content;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid #ddd;
`;

<Note placeholder="Start typing…" />;
```

The field grows in height as the user types, no controlled height state, no `onContentSizeChange` wiring. Pass `multiline={false}` explicitly to keep a fixed single-line field (a development warning points out that autosize is off in that case).

On react-native-web the declaration is handed straight to the browser, which has supported `field-sizing` natively since Chrome 123.
