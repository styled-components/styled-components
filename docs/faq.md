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

You should be aware that generating styles based on dynamic props will result in repeated CSS declarations. In other words, in the following example:

```js
const Button = styled.button`
  /* If it's a small button use less padding */
  padding: ${props => props.small ? '0.25em 1em' : '0.5em 2em'};

  /* …more styles here… */
`;
```

You would ultimately end up with two classes, both of which contain the same "more styles here" lines:

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

You may decided that this is an acceptable drawback since increasing the size of a CSS file rarely has any noticeable impact on performance compared to adding a single image to a site, but if this is a concern you can use the `css` helper to factor our the common styles into their own declaration:

```js
const moreStyles = css`
  /* …more styles here… */
`

const Button = styled.button`
  /* If it's a small button use less padding */
  padding: ${props => props.small ? '0.25em 1em' : '0.5em 2em'};
  
  ${moreStyles}
`;
```
