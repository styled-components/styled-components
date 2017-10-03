# FAQ

### My styles are being repeated multiple times

You might notice that generating styles based on dynamic props will result in repeated CSS declarations. In other words, in the following example:

```js
const Button = styled.button`
  /* If it's a small button use less padding */
  padding: ${props => props.small ? '0.25em 1em' : '0.5em 2em'};

  /* …more styles here… */
`;
```

You will ultimately end up with two classes, both of which contain the same "more styles here" lines:

```css
.foo{
  padding: 0.25em 1em;
  /* …more styles here… */
}
.bar{
  padding: 0.5em 2em;
  /* …more styles here… */
}
```

While this isn't how you would normally write CSS, it's not actually a big issue:

- On the server, you can gzip your CSS to take care of any duplication.
- On the client, this only increases the amount of *generated* CSS (and not the size of the bundle sent by the server), which doesn't have any noticeable performance impact. 
