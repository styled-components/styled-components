**DO NOT REMOVE ERRORS OR MAKE NEW ONES OUT OF SEQUENCE, ALWAYS ADD TO THE END.**

## 1

Cannot create styled-component for component: %s.

## 2

Can't collect styles once you've consumed a `ServerStyleSheet`'s styles! `ServerStyleSheet` is a one off instance for each server-side render cycle.

* Are you trying to reuse it across renders?
* Are you accidentally calling collectStyles twice?

## 3

Streaming SSR is only supported in a Node.js environment; Please do not try to call this method in the browser.

## 4

The `StyleSheetManager` expects a valid target or sheet prop!

* Does this error occur on the client and is your target falsy?
* Does this error occur on the server and is the sheet falsy?

## 5

The clone method cannot be used on the client!

* Are you running in a client-like environment on the server?
* Are you trying to run SSR on the client?

## 6

Trying to insert a new style tag, but the given Node is unmounted!

* Are you using a custom target that isn't mounted?
* Does your document not have a valid head element?
* Have you accidentally removed a style tag manually?

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

Cannot find sheet for given tag

## 11

A plain React class (%s) has been interpolated into styles, probably as a component selector (https://www.styled-components.com/docs/advanced#referring-to-other-components). Only styled-component classes can be targeted in this fashion.