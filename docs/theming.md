# Theming

Theming is a first-class citizen in `styled-components`. We want to make it as easy as possible use a reusable and sharable component library.

## Using theming

We export a `<ThemeProvider>` component that takes a `theme` prop. The `theme` you provide there is injected into your styled components via `props.theme`:

```JSX
import styled, { ThemeProvider } from 'styled-components';

const Button = styled.button`
  /* Set the background of this button from the theme */
  background: ${props => props.theme.main};
`;

// Create a green theme
const greenTheme = {
  main: 'mediumseagreen',
};

// Create a red theme
const redTheme = {
  main: 'palevioletred',
};

const MyApp = () => {
  return (
    <div>
      {/* All children of this component will be green */}
      <ThemeProvider theme={greenTheme}>
        <Button>I'm green!</Button>
      </ThemeProvider>
      {/* All children of this component will be red */}
      <ThemeProvider theme={redTheme}>
        <div>
          <Button>I'm red!</Button>
        </div>
      </ThemeProvider>
    </div>
  );
}
```

## Function themes

You can also pass a `theme` that is a function from `outerTheme => newValues`. This can be useful to make themes that are themselves contextual.

```js
/* A theme that swaps the 'fg' and 'bg' colours for all its children. */

const InvertColors = ({children}) => (
  <ThemeProvider theme={outerTheme => ({ fg: outerTheme.bg, bg: outerTheme.fg })}>
    { children }
  </ThemeProvider>
)
```
