# Theming

Theming is a first-class citizen in `styled-components`. We want to make it as easy as possible use a reusable and sharable component library.

> Note: If you're looking for some tips on setting up a shared component library, go to [`shared-component-libraries.md`](./shared-component-libraries.md)!

## Using theming

We export a `<ThemeProvider>` component that takes a `theme` prop. The `theme` you provide there is injected into your styled components via `props.theme`:

```JSX
import styled, { ThemeProvider } from 'styled-components';

const Button = styled.button`
  /* Set the background of this button from the theme */
  background: ${props => props.theme.myApp.main};
`;

// Create a green theme
const greenTheme = {
  myApp: {
    main: 'mediumseagreen',
  },
};

// Create a red theme
const redTheme = {
  myApp: {
    main: 'palevioletred',
  },
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
