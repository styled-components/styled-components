**DO NOT EDIT, THIS IS HERE FOR LEGACY PURPOSES PRIOR TO THE MONOREPO SETUP. NOW AT PACKAGES/STYLED-COMPONENTS/SRC/UTILS/ERRORS.MD**

## 1

Cannot create styled-component for component: %s.

## 2

Can't call method, once `interleaveWithNodeStream` is used, since it
will split the underlying styles into multiple parts.

- Are you trying to call `interleaveWithNodeStream` twice?
- Are you calling `getStyleTags`, `getStyleElement`, or `collectStyles` after it?

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
