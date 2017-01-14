# FAQ

### Using styled-components with webpack 2

If you're using `styled-components` with webpack 2 and you use the babel-loader you need to turn off `babel-plugin-transform-es2015-modules-commonjs`. You can do this with a configuration object passed to the es2015 or latest preset.

For `babel-preset-es2015`:
```JS
  presets: [
    ['es2015', {
      modules: false
    }]
  ]
```

For `babel-preset-latest`:
```JS
  presets: [
    ['latest': {
      es2015: {
        modules: false
      }
    }]
  ]
```

If you can't do this for whatever reason you have to hint webpack to load the commonjs bundle of `style-components`. You can do this by adding this to your webpack configuration:

```JS
alias: {
  // Use styled-components commonjs bundle instead of the es modules bundle
  'styled-components$': 'styled-components/lib/index.js',
}
```

In a future version of webpack this bug should be fixed. See [issue#115](https://github.com/styled-components/styled-components/issues/115), [issue#157](https://github.com/styled-components/styled-components/issues/157) and [webpack-issue#3168](https://github.com/webpack/webpack/issues/3168) for further information.

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
