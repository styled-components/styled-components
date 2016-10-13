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
// truncate.js
import { css } from 'styled-components';

export default function truncate(...rules) {
  return css`
    ${css(...rules)}
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;
}
```

Then you can use it like this:

```JSX
import { css } from 'styled-components';
import truncate from '../truncate';

// Make this div truncate the text with an ellipsis
const Box = styled.div`
  ${truncate`
    background-color: papayawhip;
    width: 250px;
  `}
`;
```

Does this remind you of anything? Exactly, this is kind of like a mixin in Sass – except it's not an arbitrarily added construct on top of CSS, it's just JavaScript! 👍

*Not clear on why `css` is needed in the above example? Check the article on [Tagged Template Literals](./tagged-template-literals.md)*
