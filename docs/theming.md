# Theming

Theming is a first-class citizen in `styled-components`. We want to make it as easy as possible to build, maintain and use a reusable and sharable component library.

## Basics

We export a `<ThemeProvider>` component that takes a `theme` prop which is injected into your styled components via `props.theme`:

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

**See how the theme is namespaced to `myApp`? We highly encourage both apps and especially open source component libraries to adopt this convention to avoid naming clashes in themes.**

## Component library

Creating a component library with `styled-components` is easy! Due to the inherent theming and overriding support, all you have to do is adapt based on the theme passed in.

```JSX
// my-component-library
import styled from 'styled-components';

const defaultTheme = {
  main: 'mediumseagreen',
  secondary: 'white',
};

const Button = styled.button`
  /* Adjust the colors of your button via the theme from the context */
  background: ${props => (props.theme.myComponentLib && props.theme.myComponentLib.main) || defaultTheme.main}
  color: ${props => (props.theme.myComponentLib && props.theme.myComponentLib.secondary) || defaultTheme.secondary}
`;

export { Button };
```

This `MyLibButton` component will now adapt to the theme passed in from the user.

```JSX
// user-app/index.js
import { ThemeProvider } from 'styled-components';
import { Button } from 'my-component-library';

const myComponentLibraryTheme = {
  myComponentLib: {
    main: 'palevioletred',
    secondary: 'cream',
  },
};

const UserApp = () => {
  return (
    <ThemeProvider theme={myComponentLibraryTheme}>
      <Button>I'm palevioletred!</Button>
    </ThemeProvider>
  );
}
```

We highly encourage exporting a custom `ThemeProvider` that does the namespacing of the theme for the user. (this means users don't have to be aware of it and don't have to have `styled-components` as a dependency!)

This component could look something like this:

```JSX
// my-component-library
import { ThemeProvider } from 'styled-components';

const ComponentLibThemeProvider = (props) => {
  // Namespace the theme the user passes in automatically
  const theme = {
    myComponentLib: props.theme,
  };
  return (
    <ThemeProvider theme={theme}>
      {props.children}
    </ThemeProvider>
  );
}

export default ComponentLibThemeProvider;
```

Users can then use it like this:

```JSX
// user-app/index.js
import { Button, ComponentLibThemeProvider } from 'my-component-lib';

const myTheme = {
  main: 'palevioletred',
  secondary: 'cream',
};

const UserApp = () => {
  return (
    <ComponentLibThemeProvider theme={myTheme}>
      <Button>I'm palevioletred!</Button>
    </ComponentLibThemeProvider>
  );
}
```

Now, the user no longer has to be aware that `styled-components` exists and how to use it, they just have to provide their theme! You also automatically avoid theme clashes with other component libraries users might be using at the same time since you have full control over the namepscae.
