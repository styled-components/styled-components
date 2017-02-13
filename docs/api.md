# API Reference

The APIs marked as `web` work with React, the APIs marked as `native` work with ReactNative. To switch to ReactNative mode:

```JS
import styled, { css } from 'styled-components/native';
```

## Primary

### `styled`

Default export. `web`, `native`.

This is a low-level factory we use to create the `styled.tagname` helper methods.

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

`web`, `native`.

This is what you pass into your `styled` calls – a tagged template literal. This is an ES6 language feature, so you can learn more about the basics on [MDN](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Template_literals#Tagged_template_literals).

> We are aware that this isn't an export, but it's a big part of what you'll be writing in your app, so it lives here.

#### Input

This can take any combination of

- `Rule` (`String`): Any CSS rule
- `Interpolation` (`String`|`Function`): If this is a string, we take it as-is. If this is a function, we pass in the props passed to the component as the first (and only) argument.

> **Note**: You can also pass an Object as an interpolation, and we will treat it like inline styles. This is highly discouraged, as the CSS syntax has support for media queries, nesting, etc., which the object syntax doesn't.

The properties that are passed into an interpolated function get attached a special property, `theme`, which is injected by a higher level [`ThemeProvider`](#themeprovider) component.

#### Examples

```JS
import styled from 'styled-components';

const padding = '3em';

const Section = styled.section`
	color: white;
	padding: ${padding};

	/* Adjust the background from the properties */
	background: ${(props) => props.background};

	/* Adapt based on the theme set in a parent ThemeProvider */
	border: ${(props) => props.theme.main}
`;

// Set the default theme and props fallback
Section.defaultProps = {
	background: 'palevioletred',
	theme: {
		main: 'palevioletred',
	},
};
```

```JSX
<Button>Red Button</Button>
<ThemeProvider theme={{ main: 'mediumseagreen' }}>
	<Button background="mediumseagreen">Green Button</Button>
</ThemeProvider>
```

#### Tips

- You're writing CSS, but with the power of JavaScript - utilise it! (see [Tips and Tricks](./tips-and-tricks.md) for some ideas)
- Use `defaultProps` for defaulting certain props or a theme. (it will inherit with the `styled(StyledComponent)` notation)


### `css`

`web`, `native`.

A helper function to generate CSS from a template literal with interpolations. You need to use this if you return a template literal with interpolations inside an interpolation. (this is due to how tagged template literals work)

If you're just returning a normal string you do not need to use this.

#### Arguments

1. `TaggedTemplateLiteral`: A tagged template literal with your keyframes inside.

#### Returns

- `Interpolations` (`Array`): A flattened data structure which you can pass into an interpolation.

#### Examples

```JS
import styled, { css } from 'styled-components';

const StyledComp = styled.div`
${(props) => {
	if (props.complex) {
		// Returning a template literal with interpolations? You need to use `css`
		return css`
			color: ${ props => props.whiteColor ? 'white': 'black' }
		`;
	} else {
		// Returning a standard string? No need to use `css`
		return 'color: blue;';
	}
}}
`;
```

If you leave off the `css` your function will be `toString()`ed and you'll not get the results you expected.


### `StyledComponent`

`web`, `native`.

A styled react component. This is returned when you call `styled.tagname` or `styled(Component)` with styles.

#### Tips

- This component can take any prop. It passes it on the HTML node if it's a valid attribute, otherwise it only passes it into interpolated functions. (see [TaggedTemplateLiteral](#taggedtemplateliteral))
- You can pass an arbitrary classname to a styled component without problem and it will be applied next to the styles defined by the `styled` call. (e.g. `<MyStyledComp className="bootstrap__btn" />`)

## Helpers

### `keyframes`

`web` only.

A helper method to create keyframes for animations.

#### Arguments

1. `TaggedTemplateLiteral`: A tagged template literal with your keyframes inside.

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


### `ThemeProvider`

`web`, `native`.

A helper component for theming. Injects the theme into all styled components anywhere beneath it in the component tree.

#### Props

- `theme` _(Object)_: The data that should be injected into the child styled components.

#### Example

```JS
const Box = styled.div`
	color: ${props => props.theme.color};
`;
```

```JSX
<ThemeProvider theme={{ color: 'mediumseagreen' }}>
	<Box>I'm mediumseagreen!</Box>
</ThemeProvider>
```

### `injectGlobal`

`web` only.

A helper method to write global CSS. Does not return a component, adds the styles to the stylesheet directly.

**We do not encourage the use of this. Use once per app at most, contained in a single file.** This is an escape hatch. Only use it for the rare `@font-face` definition or `body` styling.

#### Arguments

1. `TaggedTemplateLiteral`: A tagged template literal with your global styles inside.

#### Example

```JS
// global-styles.js

import { injectGlobal } from 'styled-components';

injectGlobal`
	@font-face {
	  font-family: 'Operator Mono';
	  src: url('../fonts/Operator-Mono.ttf');
	}

	body {
		margin: 0;
	}
`;
```

### `withTheme`

`web`, `native`.

This is a `higher order component` to get the current theme from [`ThemeProvider`](#themeprovider) and pass it to another component as a `theme` prop.

#### Arguments

1. `component` _(Function|class)_: Any valid react component that can handle a `theme` prop.

#### Returns

(`component`): The passed component inside a wrapper. The passed component will receive a `theme` prop with the current theme object.

#### Example

```JS
import { withTheme } from 'styled-components'

class MyComponent extends React.Component {
  render() {
    const { theme } = this.props

    console.log('Current theme: ', theme);
    // ...
  }
}

export default withTheme(MyComponent)
```

#### Tips

- Only use this if you need to get the theme as a prop. If you just need to set a valid stylesheet property, you can use normal [theming](./theming.md) for this.
