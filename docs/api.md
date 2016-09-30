# API Reference

## Primary

### `styled`

Default export. This is a low-level factory we use to create the `styled.tagname` helper methods.

#### Arguments

1. `component`|`tagname` _(Function|String)_: Either a valid react component or a tagname like `'div'`.

#### Returns

(`Anonymous Function`): A function that takes your [`TaggedTemplateLiteral`](#taggedtemplateliteral) and turns it into a [`StyledComponent`](#styledcomponent).

#### Example

```JS
import styled from 'styled-components';

const Button = styled.button`
background: palevioletred;
border-radius: 3px;
border: none;
color: white;
`;

const TomatoButton = styled(Button)`
background: tomato;
`;
```

```JSX
<Button>I am palevioletred</Button>
<TomatoButton>I am tomato</TomatoButton>
```

#### Tips

- We encourage you to not use the `styled('tagname')` notation directly. Instead, rely on the `styled.tagname` helpers like `styled.button`. We define all valid HTML5 and SVG elements. (it's an automatic fat finger check too)

### `TaggedTemplateLiteral`

This is what you pass into your `styled` calls – a tagged template literal. This is an ES6 language feature, so you can learn more about the basics on [MDN](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Template_literals#Tagged_template_literals).

> We are aware that this isn't an export, but it's a big part of what you'll be writing in your app, so it lives here.

#### Input

This can take any combination of

- `Rule` (`String`): Any CSS rule
- `Interpolation` (`String`|`Function`|`Object`): If this is a string, we take it as-is. If this is a function, we pass in the props passed to the component as the first (and only) argument. If this is an object, we interpret it as inline styles.

#### Examples

```JS
import styled from 'styled-components';

const padding = '3em';

const Section = styled.section`
color: white;
padding: ${padding};
background: ${(props) => props.background || 'palevioletred'};
`;
```

```JSX
<Section>I have a palevioletred background</Section>
<Section background="papayawhip">I have a papayawhip background</Section>
```

### `StyledComponent`

TK

## Helpers

### `css`

TK

### `keyframes`

A helper method to create keyframes for animations.

#### Arguments

- `TaggedTemplateLiteral`: A tagged template literal with your keyframes inside.

#### Returns

`name` ( `String`): A unique name for these keyframes, to be used in your `animation` declarations.

#### Example

```JS
// keyframes.js
import { keyframes } from 'styled-components';

const fadeIn = keyframes`
0% {
	opacity: 0;
}
100% {
	opacity: 1;
}
`;

export {
	fadeIn,
}
```

```JS
import styled from 'styled-components';
import { fadeIn } from '../keyframes';

const FadeInButton = styled.button`
animation: 1s ${fadeIn} ease-out;
`;
```

### `global`

A helper method to write global CSS. Does not return a component, adds the styles to the stylesheet directly.

**We do not encourage the use of this. Use once per app at most, contained in a single file.** This is an escape hatch. Only use it for the rare `@font-face` definition or `body` styling.

#### Arguments

- `TaggedTemplateLiteral`: A tagged template literal with your global styles inside.

#### Example

```JS
// global-styles.js

import { global } from 'styled-components';

global`
@font-face {
  font-family: 'Operator Mono';
  src: url('../fonts/Operator-Mono.ttf');
}

body {
	margin: 0;
}
`;
```
