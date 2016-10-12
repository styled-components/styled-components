# Shared Component Libraries

`styled-components` makes creating a component library a first class citizen. Due to the inherent theming and overriding support, all you have to do is adapt based on the theme and props passed into your component!

Here are some tips for setting up a shared component library. (both company-internal and open source)

## Tips

### TL;DR

Here is a short checklist of some conventions that work well:

- Namespace your theme to avoid naming clashes
- Export a custom `ThemeProvider` component to…
  - …do the namespacing automatically for the user so they don't _have_ to be aware of `styled-components`
  - …set the default theme
- Use theme for global settings like colors, props for localized settings like button size
- Preferably export the styled component directly to make the `styled(YourLibComponent)` notation work

### Namespace your theme and export a custom `ThemeProvider`

We highly encourage following the convention of namespacing your theme to avoid naming clashes. `styled-components` merges overlapping themes together, (e.g. from nested `ThemeProvider`s) so if your theme isn't namespaced you risk the chance of having another theme override yours.

```JS
// Adjust the styles via the theme passed in
// from props.theme.componentLib
const Button = styled.button`
  background: ${props => props.theme.componentLib.main}
  color: ${props => props.theme.componentLib.secondary}
`;
```

The problem is that your users have to be aware of the namespacing and have to have `styled-components` as a dependency:

```JSX
// your-users-app/index.js
import { ThemeProvider } from 'styled-components';
// 👆😢 Users have to have styled-components as dependency

const theme = {
  componentLib: {
  // 👆😢 Users have to be aware of the namespacing which
  // makes unique names hard
    main: 'black',
  },
};

const App = () => (
  <ThemeProvider theme={theme}>
    <MainComponent />
  </ThemeProvider>
);
```

Instead we highly encourage exporting a custom `ThemeProvider` that does the namespacing of the theme for the user. (this means users don't have to be aware of it **and** don't have to have `styled-components` as a dependency)

```JSX
// component-lib/ThemeProvider.js
import { ThemeProvider } from 'styled-components';

const ComponentLibThemeProvider = (props) => {
  const theme = {
    myComponentLib: props.theme,
    // Namespace the theme for the user
  };
  return (
    <ThemeProvider theme={theme}>
      {props.children}
    </ThemeProvider>
  );
}

export default ComponentLibThemeProvider;
```

Users can then use your custom `ThemeProvider` like this:

```JSX
// your-users-app/index.js
import { Button, ThemeProvider } from 'component-lib';
// 👆👌 No extra dependency needed on the users side

const myTheme = {
  main: 'palevioletred',
  secondary: 'cream',
  // 👆👌 No namespacing needed on the users side
};

const UserApp = () => {
  return (
    <ThemeProvider theme={myTheme}>
      <Button>I have the users theme!</Button>
    </ThemeProvider>
  );
}
```

- The user no longer has to have `styled-components` as a dependency, they solely have to provide their theme
- You automatically avoid theme clashes with other component libraries users might be using at the same time

> **Note:** Now that you have full control over the namespace, you can also make it something unique like `__COMPONENT_LIB_NAMESPACE__DO_NOT_TOUCH_OR_YOU_WILL_BE_FIRED__` to 99.99999% surely avoid naming clashes.

### Set the default theme

Another benefit of exporting a custom `ThemeProvider` is that you can set the default theme of your library and avoid tons of "does this property exist" check.

```JSX
// component-lib/ThemeProvider.js
import { ThemeProvider } from 'styled-components';

const defaultTheme = {
  main: 'mediumseagreen',
  secondary: 'white',
  // 👆 Create the default theme
};

const ComponentLibThemeProvider = (props) => {
  const theme = {
    myComponentLib: Object.assign({}, defaultTheme, props.theme),
    // 👆 Merge the default theme with the user-provided theme
  };
  return (
    <ThemeProvider theme={theme}>
      {props.children}
    </ThemeProvider>
  );
}

export default ComponentLibThemeProvider;
```

Now in your components, you can do this:

```JS
const Button = styled.button`
  background: ${props => (props.theme.componentLib && props.theme.componentLib.main) || 'mediumseagreen'}
  /* 👆😢 Before: Make sure the componentLib theme exists and then set the default */
  background: ${props => props.theme.componentLib.main}
  /* 👆👌 Now: The property exists for sure, either the default or a user provided one */
`;
```

Much nicer!
