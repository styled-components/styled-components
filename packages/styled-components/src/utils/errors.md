**DO NOT REMOVE ERRORS OR MAKE NEW ONES OUT OF SEQUENCE, ALWAYS ADD TO THE END.**

## 1

Cannot create styled-component for component: %s.

## 2

Can't collect styles once you've consumed a `ServerStyleSheet`'s styles! `ServerStyleSheet` is a one off instance for each server-side render cycle.

- Are you trying to reuse it across renders?
- Are you accidentally calling collectStyles twice?

## 3

Streaming SSR is only supported in a Node.js environment; Please do not try to call this method in the browser.

## 4

The `StyleSheetManager` expects a valid target or sheet prop!

- Does this error occur on the client and is your target falsy?
- Does this error occur on the server and is the sheet falsy?

## 5

The clone method cannot be used on the client!

- Are you running in a client-like environment on the server?
- Are you trying to run SSR on the client?

## 6

Trying to insert a new style tag, but the given Node is unmounted!

- Are you using a custom target that isn't mounted?
- Does your document not have a valid head element?
- Have you accidentally removed a style tag manually?

## 7

ThemeProvider: Please return an object from your "theme" prop function, e.g.

```js
theme={() => ({})}
```

## 8

ThemeProvider: Please make your "theme" prop an object.

## 9

Missing document `<head>`

## 10

Cannot find a StyleSheet instance. Usually this happens if there are multiple copies of styled-components loaded at once. Check out this issue for how to troubleshoot and fix the common cases where this situation can happen: https://github.com/styled-components/styled-components/issues/1941#issuecomment-417862021

## 11

_This error was replaced with a dev-time warning, it will be deleted for v4 final._ [createGlobalStyle] received children which will not be rendered. Please use the component without passing children elements.

## 12

It seems you are interpolating a keyframe declaration (%s) into an untagged string. This was supported in styled-components v3, but is not longer supported in v4 as keyframes are now injected on-demand. Please wrap your string in the css\`\` helper which ensures the styles are injected correctly. See https://www.styled-components.com/docs/api#css

## 13

%s is not a styled component and cannot be referred to via component selector. See https://www.styled-components.com/docs/advanced#referring-to-other-components for more details.

## 14

ThemeProvider: "theme" prop is required.

## 15

A stylis plugin has been supplied that is not named. We need a name for each plugin to be able to prevent styling collisions between different stylis configurations within the same app. Before you pass your plugin to `<StyleSheetManager stylisPlugins={[]}>`, please make sure each plugin is uniquely-named, e.g.

```js
Object.defineProperty(importedPlugin, 'name', { value: 'some-unique-name' });
```

## 16

Reached the limit of how many styled components may be created at group %s.
You may only create up to 1,073,741,824 components. If you're creating components dynamically,
as for instance in your render method then you may be running into this limitation.

## 17

CSSStyleSheet could not be found on HTMLStyleElement.
Has styled-components' style tag been unmounted or altered by another script?

## 18

Accessing `useTheme` hook outside of a `<ThemeProvider>` element.

```jsx
import { useTheme } from 'styled-components';
export function StyledCompoent({ children }) {
  const theme = useTheme();
  return <div style={{ width: theme.sizes.full }}>{children}</div>;
}

import { StyledComponent } from './StyledComponent';
import { theme } from './theme';
export function App() {
  return (
    <ThemeProvider theme={theme}>
      <StyledComponent />
    </ThemeProvider>
  );
}
```

If you need access to the theme in an uncertain composition scenario, `React.useContext(ThemeContext)` will not emit an error if there is no `ThemeProvider` ancestor.
