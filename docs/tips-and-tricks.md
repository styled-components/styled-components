# Tips and tricks

A bunch of useful tips and tricks when working with `styled-components`!

## Using JavaScript to our advantage

To adjust the placeholder color of an input, we need to use the <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/::placeholder">`::placeholder`</a> pseudo element.

> To attach pseudo elements to your styled component, you need to use `&`. For example, to style the placeholder:

```JSX
const Input = styled.input`
  /* Some other styles here… */

  /* Style the placeholder */
  &::placeholder {
    color: palevioletred;
    opacity: 0.5;
  }
`;
```

If you tried to actually run the above example, you'd likely see that the placeholder is still grey.

The unprefixed `::placeholder` pseudo-element is currently only supported in Firefox 51 – we also need to use `::-webkit-input-placeholder`, `::-moz-placeholder`, `:-moz-placeholder` (notice the single colon) and `:-ms-input-placeholder`.

Instead of hardcoding them into our `<Input>`, we can write a JavaScript function that adds those automatically! We can then reuse that function whenever we need to style a placeholder:

```JS
// placeholder.js

export default function placeholder(rules) {
  return `
    &::placeholder {
      ${rules}
    }

    &::-webkit-input-placeholder {
      ${rules}
    }

    &::-moz-placeholder {
      ${rules}
    }

    &:-ms-input-placeholder {
      ${rules}
    }
  `;
}
```

Which would be used like this:

```JSX
import placeholder from '../placeholder';

const Input = styled.input`
  // Old styles here…

  // Style the placeholder
  ${placeholder(`
    color: palevioletred;
    opacity: 0.5;
  `)}
`;
```

<div align="center">
  <a href="http://www.webpackbin.com/NkZ61pHab">
    <img alt="Screenshot of the above code ran in a browser" src="http://imgur.com/9Etm2yl.jpg" />
    <div><em>Live demo</em></div>
  </a>
</div>

Does this remind you of anything? Exactly, this is kind of like a mixin in Sass – except it's not an arbitrarily added construct on top of CSS, it's just JavaScript! 👍
