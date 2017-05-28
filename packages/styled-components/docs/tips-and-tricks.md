# Tips and tricks

A collection of useful tips and tricks when working with `styled-components`!

## Component adjustments

Say you have a `<Button>` that has a `padding` of `0.5em 2em`:

```JS
const Button = styled.button`
  padding: 0.5em 2em;

  /* …more styles here… */
`;
```

Now your designer has added a new comment section to your articles, and they want the buttons in that section to be smaller than the regular ones.

Using interpolated functions, adjusting the button size is easy as pie:

```JS
const Button = styled.button`
  /* If it's a small button use less padding */
  padding: ${props => props.small ? '0.25em 1em' : '0.5em 2em'};

  /* …more styles here… */
`;
```

Then, in your comment section, you can simply say that the `<Button>` should be small:

```JSX
<Button>This is a normal button!</Button>
<Button small>This is a small button!</Button>
```

## Using JavaScript to our advantage

To make a line overflow with an ellipsis (`…`) when the text is longer than the container element is wide, you need three CSS properties:

```CSS
.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

The width of the container element also needs to be set explicitly:

```CSS
.truncate {
  /* Needs to be specific width */
  width: 250px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

You could create a separate component for truncating, but in this case reusing the CSS might not be a bad idea! Instead of hardcoding those lines of code in every component you want to truncate though, you could write a function that does it for you:

```JS
// style-utils.js
export function truncate(width) {
  return `
    width: ${width};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;
}
```

Then you can use it like this:

```JSX
import { truncate } from '../style-utils';

// Make this div truncate the text with an ellipsis
const Box = styled.div`
  ${ truncate('250px') }
  background: papayawhip;
`;
```

Does this remind you of anything? Exactly, this is kind of like a mixin in Sass – except it's not an arbitrarily added construct on top of CSS, it's just JavaScript! 👍

## More powerful example

One of the more powerful features of Sass mixins is `@content`, which works a bit like passing `props.children` to a React component, except for CSS:

```scss
@mixin handheld {
  @media (max-width: 420px) {
    @content;
  }
}

.box {
  font-size: 16px;
  @include handheld {
    font-size: 14px;
  }
}
```

Now we have javascript, we can do 🌟 _more powerful things_ 🌟

```js
// style-utils.js
import { css } from 'styled-components'

export const media = {
  handheld: (...args) => css`
    @media (max-width: 420px) {
      ${ css(...args) }
    }
  `
}
```

```js
import { media } from '../style-utils';

// Make the text smaller on handheld devices
const Box = styled.div`
  font-size: 16px;
  ${ media.handheld`
    font-size: 14px;
  ` }
`;
```

And voila! 💅

*Not clear on why `css` is needed in the above example? Check the article on [Tagged Template Literals](./tagged-template-literals.md)*

### Media Templates

Due to the functional nature of javascript, you can easily define your own tagged template literal to wrap styles in media queries. For example:

```js
// these sizes are arbitrary and you can set them to whatever you wish
import { css } from 'styled-components'

const sizes = {
  giant: 1170,
  desktop: 992,
  tablet: 768,
  phone: 376
}

// iterate through the sizes and create a media template
export const media = Object.keys(sizes).reduce((accumulator, label) => {
  // use em in breakpoints to work properly cross-browser and support users
  // changing their browsers font-size: https://zellwk.com/blog/media-query-units/
  const emSize = sizes[label] / 16
  accumulator[label] = (...args) => css`
    @media (max-width: ${emSize}em) {
      ${css(...args)}
    }
  `
  return accumulator
}, {})
```

Great! Now that you've defined your media templates, you can use them like this:

```js
const Container = styled.div`
  color: #333;
  ${media.desktop`padding: 0 20px;`}
  ${media.tablet`padding: 0 10px;`}
  ${media.phone`padding: 0 5px;`}
`
```

Pretty easy, huh?

### Refs to DOM nodes

Passing `ref` to styled component will give a ref to the `StyledComponent`
wrapper, not to DOM node. So it's not possible to call DOM methods, like focus
on that wrapper. To get a `ref` to wrapped DOM node, pass `innerRef` prop.

> **Note:** `innerRef` only supports callback refs (i.e. `ref={comp => this.bla = comp}`), string refs (i.e. `ref="bla"`) won't work. Since string based refs will be deprecated in the future anyway, don't worry about it too much and just use the callback pattern.

```JSX
const StyledInput = styled.input`
  color: paleviolet;
`;

class Form extends Component {
  componentDidMount() {
    this.input.focus()
  }

  render() {
    return (
      <StyledInput innerRef={(comp) => { this.input = comp }} />
    )
  }
}
```
