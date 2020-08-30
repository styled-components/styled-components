# Changelog

All notable changes to this project will be documented in this file. If a contribution does not have a mention next to it, [@geelen](https://github.com/geelen) or [@mxstbr](https://github.com/mxstbr) did it.

_The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/)._

## Unreleased

- Make sure `StyleSheetManager` renders all styles in iframe / child windows (see [#3159](https://github.com/styled-components/styled-components/pull/3159)) thanks @eramdam!

- Rework how components self-reference in extension scenarios (see [#3236](https://github.com/styled-components/styled-components/pull/3236)); should fix a bunch of subtle bugs around patterns like `& + &`

- Fix `keyframes` not receiving a modified stylis instance when using something like `stylis-plugin-rtl` (see [#3239](https://github.com/styled-components/styled-components/pull/3239))

- Big performance gain for components using [style objects](https://styled-components.com/docs/advanced#style-objects) (see [#3239](https://github.com/styled-components/styled-components/pull/3239))

- We no longer emit dynamic classNames for empty rulesets, so some className churn may occur in snapshots

- Preallocate global style placement to ensure cGS is consistently inserted at the top of the stylesheet; note that this is done in _runtime order_ so, if you have multiple cGS that have overlapping styles, ensure they're defined in code in the sequence you would want them injected (see [#3239](https://github.com/styled-components/styled-components/pull/3239))

- Add "engines" to package.json (currently set to Node 10, the oldest supported LTS distribution) (see [#3201](https://github.com/styled-components/styled-components/pull/3201)) thanks @MichaelDeBoey!

## [v5.1.1] - 2020-04-07

### New Functionality

- Implement `shouldForwardProp` API for native and primitive platforms, which was previously missing in [v5.1.0] (see [#3093](https://github.com/styled-components/styled-components/pull/3107))
  This has been released under a patch bump instead of a minor, since it's only been missing from Native-support.

### Bugfixes

- Added `useTheme` hook to named exports for react-primitives entrypoint (see [#2982](https://github.com/styled-components/styled-components/pull/2982)) thanks @jladuval!
- Escape every CSS ident character necessary when converting component display names to class names (see [#3102](https://github.com/styled-components/styled-components/pull/3102)) thanks @kripod!

## [v5.1.0] - 2020-04-07

### New Functionality

- Add `shouldForwardProp` API (almost the same as emotion's, just a slightly different usage pattern); https://github.com/styled-components/styled-components/pull/3006

  Sometimes when composing multiple higher-order components together, it's possible to get into scenarios when multiple layers consume props by the same name. In the past we've introduced various workarounds for popular props like `"as"` but this power-user API allows for more granular customization of what props are passed down to descendant component children when using the `styled()` HOC wrapper.

  When combined with other APIs like `.attrs()` this becomes a very powerful constellation of abilities.

  Here's how you use it:

  ```jsx
  const Comp = styled('div').withConfig({
    shouldForwardProp: (prop, defaultValidatorFn) => !['filterThis'].includes(prop),
  })`
    color: red;
  `;

  render(<Comp filterThis="abc" passThru="def" />);

  # Renders: <div className="[generated]" passThru="def"></div>
  ```

  The second argument `defaultValidatorFn` is what we use internally to validate props based on known HTML attributes. It's provided so you can filter exactly what props you don't wish to pass and then fall-back to the default filtering mechanism if desired.

  Other methods on the `styled` HOC like `.attrs` can be chained after `withConfig()`, and before opening your template literal:

  ```jsx
  const Comp = styled('div').withConfig({
    shouldForwardProp: (prop, defaultValidatorFn) => !['filterThis'].includes(prop),
  }).attrs({ className: 'foo' })`
    color: red;
  `;

  render(<Comp filterThis="abc" passThru="def" />);

  # Renders: <div className="[generated] foo" passThru="def"></div>
  ```

  Thanks @stevesims and all that contributed!

- Add "transient props" API; https://github.com/styled-components/styled-components/pull/3052

  Think of [_transient props_](https://medium.com/@probablyup/introducing-transient-props-f35fd5203e0c) as a lightweight, but complementary API to `shouldForwardProp`. Because styled-components allows any kind of prop to be used for styling (a trait shared by most CSS-in-JS libraries, but not the third party library ecosystem in general), adding a filter for every possible prop you might use can get cumbersome.

  _Transient props_ are a new pattern to pass props that are explicitly consumed only by styled components and are not meant to be passed down to deeper component layers. Here's how you use them:

  ```jsx
  const Comp = styled.div`
    color: ${props => props.$fg || 'black'};
  `;

  render(<Comp $fg="red">I'm red!</Comp>);
  ```

  Note the dollar sign (`$`) prefix on the prop; this marks it as _transient_ and styled-components knows not to add it to the rendered DOM element or pass it further down the component hierarchy.

### Bugfixes

- Fix slow SSR Rehydration for malformed CSS and increase fault-tolerance (see [#3018](https://github.com/styled-components/styled-components/pull/3018))

- Change isPlainObject (internal method) to support objects created in a different context (see [#3068](https://github.com/styled-components/styled-components/pull/3068)) thanks @keeganstreet!

- Add support for the `<video disablePictureInPicture>` (see [#3058](https://github.com/styled-components/styled-components/pull/3058)) thanks @egdbear!

## [v5.0.1] - 2020-02-04

- Added useTheme hook to named exports for react native

- Performance enhancements

  - Refactored hashing function that is a bit faster in benchmarks
  - Fixed a bitwise math issue that was causing SSR performance degradations due to how we allocate typed arrays under the hood

- Added some helpful new dev-time warnings for antipatterns
  - Recommending against usage of css `@import` inside `createGlobalStyle` and what to do instead
  - Catching and warning against dynamic creation of styled-components inside other component render paths

## [v5.0.0] - 2020-01-13

Read the [v5 release announcement](https://medium.com/styled-components/announcing-styled-components-v5-beast-mode-389747abd987)!

- 19% smaller bundle size
- 18% faster client-side mounting
- 17% faster updating of dynamic styles
- 45% faster server-side rendering
- RTL support

**NOTE: At this time we recommend not using `@import` inside of `createGlobalStyle`. We're working on better behavior for this functionality but it just doesn't really work at the moment and it's better if you just embed these imports in your HTML index file, etc.**

- `StyleSheetManager` enhancements
  - you can now supply stylis plugins like [stylis-plugin-rtl](https://www.npmjs.com/package/stylis-plugin-rtl); `<StyleSheetManager stylisPlugins={[]}>...</StyleSheetManager>`
  - `disableVendorPrefixes` removes autoprefixing if you don't need legacy browser support; `<StyleSheetManager disableVendorPrefixes>...</StyleSheetManager>`
  - `disableCSSOMInjection` forces using the slower injection mode if other integrations in your runtime environment can't parse CSSOM-injected styles; `<StyleSheetManager disableCSSOMInjection>...</StyleSheetManager>`

* **Remove deprecated attrs "subfunction" syntax variant**

  ```js
  styled.div.attrs({ color: p => p.color });
  ```

  should become

  ```js
  styled.div.attrs(p => ({ color: p.color }));
  ```

  You can still pass objects to `attrs` but individual properties shouldn't have functions that receive props anymore.

* Fix attrs not taking precedence over props when overriding a given prop

* (ReactNative) upgrade css-to-react-native to v3 ([changelog](https://github.com/styled-components/css-to-react-native/releases/tag/v3.0.0))

  - Removed support for unitless line height in font shorthand

* Replace `merge-anything` with `mixin-deep` to save some bytes (this is what handles merging of `defaultProps` between folded styled components); this is inlined into since the library is written in IE-incompatible syntax

* Fix certain adblockers messing up styling by purposefully not emitting the substring "ad" (case-insensitive) when generating dynamic class names

* Fix regressed behavior between v3 and v4 where className was not correctly aggregated between folded `.attrs` invocations

## [v4.4.1] - 2019-10-30

- Fix `styled-components`'s `react-native` import for React Native Web, by [@fiberjw](https://github.com/fiberjw) (see [#2797](https://github.com/styled-components/styled-components/pull/2797))

- Remove dev-time warning if referencing a theme prop without an outer `ThemeProvider`, the check for it isn't smart enough to handle cases with "or" or ternary fallbacks and creates undesirable noise in various third party integrations

## [v4.4.0] - 2019-09-23

- Fix to use `ownerDocument` instead of global `document`, by [@yamachig](https://github.com/yamachig) (see [#2721](https://github.com/styled-components/styled-components/pull/2721))

- Backport fix for SSR classname mismatches in development mode for some environments like next.js (see [#2701](https://github.com/styled-components/styled-components/pull/2701))

- Fix attrs not properly taking precedence over props

- Backport fix where classnames are composed in the wrong order if custom class names are passed in (see [#2760](https://github.com/styled-components/styled-components/pull/2760))

- Fix add check for style tag detached - sheet in the style tag is null in this case, by [@newying61](https://github.com/newying61) (see [#2707](https://github.com/styled-components/styled-components/pull/2707))

## [v4.3.2] - 2019-06-19

- Fix usage of the "css" prop with the styled-components babel macro (relevant to CRA 2.x users), by [@jamesknelson](http://github.com/jamesknelson) (see [#2633](https://github.com/styled-components/styled-components/issues/2633))

## [v4.3.1] - 2019-06-06

- Revert #2586; breaks rehydration in dev for certain runtimes like next.js

## [v4.3.0] - 2019-06-05

- Make it possible to initialize `SC_ATTR` and `SC_DISABLE_SPEEDY` via `REACT_APP_*` .env variables for easier integration with CRA applications (see [#2501](https://github.com/styled-components/styled-components/pull/2501))

- Fix `theme` prop for styled native components, also fixes `theme` in
  `defaultProps` for them.

- Add "forwardedAs" prop to allow deeply passing a different "as" prop value to underlying components
  when using `styled()` as a higher-order component

- Implement defaultProps folding (see [#2597](https://github.com/styled-components/styled-components/issues/2597))

## [v4.2.1] - 2019-05-30

- Remove className usage checker dev utility due to excessive false-positive noise in certain runtime environments like next.js and the related warning suppression prop (see [#2563](https://github.com/styled-components/styled-components/issues/2563)).

- Attach displayName to forwardRef function as described in React docs (see [#2508](https://github.com/styled-components/styled-components/issues/2508)).

- Compatibility with react-native-web 0.11 (see [#2453](https://github.com/styled-components/styled-components/issues/2453)).

- Add stack trace to .attrs warning (see [#2486](https://github.com/styled-components/styled-components/issues/2486)).

- Fix functions as values for object literals. (see [2489](https://github.com/styled-components/styled-components/pull/2489))

- Remove validation in Babel macro, by [@mAAdhaTTah](http://github.com/mAAdhaTTah) (see [#2427](https://github.com/styled-components/styled-components/pull/2427))

## [v4.2.0] - 2019-03-23

- Reduced GC pressure when using component selector styles. (see [#2424](https://github.com/styled-components/styled-components/issues/2424)).

- Add svg tag `marker` to domElements.js (see [#2389](https://github.com/styled-components/styled-components/pull/2389))

- Make the `GlobalStyleComponent` created by `createGlobalStyle` call the base constructor with `props` (see [#2321](https://github.com/styled-components/styled-components/pull/2321)).

- Move to Mono repository structure with lerna [@imbhargav5](https://github.com/imbhargav5) (see [#2326](https://github.com/styled-components/styled-components/pull/2326))

- Expose `StyleSheetContext` and `StyleSheetConsumer` for you fancy babes doing wild stuff

- Filter `suppressClassNameWarning` to not to pass down to the wrapped components [@taneba](https://github.com/taneba) (see [#2365](https://github.com/styled-components/styled-components/pull/2365))

- Fix an edge case where React would break streaming inside `<textarea>` elements, which have special child behavior and aren't a suitable place to inject a style tag (see [#2413](https://github.com/styled-components/styled-components/pull/2413))

## [v4.1.3] - 2018-12-17

- Under the hood code cleanup of the Babel macro, by [@lucleray](https://github.com/lucleray) (see [#2286](https://github.com/styled-components/styled-components/pull/2286))

## [v4.1.2] - 2018-11-28

- Fix function-form attrs to receive the full execution context (including theme) (see [#2210](https://github.com/styled-components/styled-components/pull/2210))

- Adjust `innerRef` deprecation warning to not be fired if wrapping a custom component, since that underlying component may not be on forwardRef yet and actually using the prop (see [#2211](https://github.com/styled-components/styled-components/pull/2211))

- Expose the `ThemeConsumer` and `ThemeContext` exports for the native and primitives entries (see [#2217](https://github.com/styled-components/styled-components/pull/2217))

- Remove `createGlobalStyle` multimount warning; Concurrent and Strict modes intentionally render the same component multiple times, which causes this warning to be triggered always even when usage is correct in the application (see [#2216](https://github.com/styled-components/styled-components/pull/2216))

- Folded components are now targettable via component selector as in v3 if you used the old `.extend` API (see [#2239](https://github.com/styled-components/styled-components/pull/2239))

- Don't treat uppercased strings as tag-like components and don't filter out props from them (see [#2225](https://github.com/styled-components/styled-components/pull/2225))

## [v4.1.1] - 2018-11-12

- Put back the try/catch guard around a part of the flattener that sometimes receives undetectable SFCs (fixes an errand hard error in an edge case)

## [v4.1.0] - 2018-11-12

- Performance optimization for fully static (no function interpolation) styled-components by avoiding using `ThemeConsumer` since it isn't necessary, by [@mxstbr](https://github.com/mxstbr) (see [#2166](https://github.com/styled-components/styled-components/pull/2166))

- Allow disabling "speedy" mode via global `SC_DISABLE_SPEEDY` variable, by [@devrelm](https://github.com/devrelm) (see [#2185](https://github.com/styled-components/styled-components/pull/2185))

  To make use of this, you can either set `SC_DISABLE_SPEEDY` in your app's entry file or use something like `webpack.DefinePlugin` to do it at build time:

  ```js
  webpack.DefinePlugin({
    SC_DISABLE_SPEEDY: true,
  });
  ```

- Attrs can now be passed a function (see [#2200](https://github.com/styled-components/styled-components/pull/2200)); thanks [@oliverlaz](https://github.com/oliverlaz) for providing an early PoC PR for this!

  e.g.:

  ```js
  styled.div.attrs(props => ({ 'aria-title': props.title }))``;
  ```

- Fix the `warnTooManyClasses` dev helper not being totally dead code eliminated in production (see [#2200](https://github.com/styled-components/styled-components/pull/2200))

- Deprecate functions as object keys for object-form attrs (see [#2200](https://github.com/styled-components/styled-components/pull/2200))

  e.g.:

  ```js
  styled.div.attrs({ 'aria-title': props => props.title })``; // bad
  styled.div.attrs(props => ({ 'aria-title': props.title }))``; // good
  ```

  Support for this will be removed in styled-components v5. The primary impetus behind this change is to eliminate confusion around basic functions vs styled-components vs React components provided as values in the object-form attrs constructor, each of which has different handling behaviors. The single outer function to receive the props and then return a props object is conceptually simpler.

- The standalone CDN build is now UMD-compliant and can be used with RequireJS, etc.

- Add pixels to unitless numbers when object interpolation is used, by [@Fer0x](https://github.com/Fer0x) (see [#2173](https://github.com/styled-components/styled-components/pull/2173))

- Trying to interpolate a non-styled component into CSS is now a hard error, rather than a warning (see [#2173](https://github.com/styled-components/styled-components/pull/2173))

## [v4.0.3] - 2018-10-30

- Interpolating a styled component into a string now returns the static component selector (emotion cross-compat)

  ```js
  import styled from 'styled-components';

  const Comp = styled.div`
    color: red;
  `;

  `${Comp}`; // .sc-hash
  ```

- Add `suppressClassNameWarning` prop to disable warning when wrapping a React component with `styled()` and the `className` isn't used, by [@Fer0x](https://github.com/Fer0x) (see [#2156](https://github.com/styled-components/styled-components/pull/2156))

- Expose ThemeContext to enable static contextType support for React 16.6, by [@imbhargav5](https://github.com/imbhargav5) (see [#2152](https://github.com/styled-components/styled-components/pull/2152))

- Filter out invalid HTML attributes from `attrs`, by [@Fer0x](https://github.com/Fer0x) (see [#2133](https://github.com/styled-components/styled-components/pull/2133))

- Add warning if an `attrs` prop is a function that returns an element, by [@timswalling](https://github.com/timswalling) (see [#2162](https://github.com/styled-components/styled-components/pull/2162))

## [v4.0.2] - 2018-10-18

- Handle an edge case where an at-rule was being supplied to the self-reference stylis plugin at an incorrect context setting, by [@probablyup](https://github.com/probablyup) (see [#2114](https://github.com/styled-components/styled-components/pull/2114))

## [v4.0.1] - 2018-10-17

- Add suppressMultiMountWarning prop to disable warning on multiple cgs mount, by [@imbhargav5](https://github.com/imbhargav5) (see [#2107](https://github.com/styled-components/styled-components/pull/2107))

- Fix self-reference replacement edge cases, by [@probablyup](https://github.com/probablyup) (see [#2109](https://github.com/styled-components/styled-components/pull/2109))

## [v4.0.0] - 2018-10-15

This is a rollup of the highlights of beta 0-11 for convenience. See the [migration guide](https://www.styled-components.com/docs/faqs#what-do-i-need-to-do-to-migrate-to-v4) for easy updating steps and the [beta announcement blog](https://medium.com/styled-components/announcing-styled-components-v4-better-faster-stronger-3fe1aba1a112) for our summary of v4's changes, thought process, etc.

### New stuff

- Add babel macro for full-featured interop with create react app v2+, by [@lucleray](https://github.com/lucleray) (see [#2032](https://github.com/styled-components/styled-components/pull/2032))

- Expose `ThemeConsumer` component, context consumer render prop component from the `React.createContext` API if people are interested in using it rather than / in addition to the `withTheme` HOC, by [@probablyup](https://github.com/probablyup)

- Add `createGlobalStyle` that returns a component which, when mounting, will apply global styles. This is a replacement for the `injectGlobal` API. It can be updated, replaced, removed, etc like any normal component and the global scope will update accordingly, by [@JamieDixon](https://github.com/JamieDixon) [@marionebl](https://github.com/marionebl), [@yjimk](https://github.com/yjimk), and [@imbhargav5](https://github.com/imbhargav5) (see [#1416](https://github.com/styled-components/styled-components/pull/1416))

  ```jsx
  const GlobalStyles = createGlobalStyle`
    html {
      color: 'red';
    }
  `;

  // then put it in your React tree somewhere:
  // <GlobalStyles />
  ```

- Added a first-class API for rendering polymorphism via "as" prop. In most cases, this new prop will replace your need to use the `.withComponent` API. It allows you to control what underlying element or component is rendered at runtime, while not messing with the styles, by [@probablyup](https://github.com/probablyup) (see [#1962](https://github.com/styled-components/styled-components/pull/1962))

  ```jsx
  import { Link } from 'react-router'

  const Component = styled.div`
    color: red;
  `

  // Examples
  <Component>Hello world!</Component>
  <Component as="span">Hello world!</Component>
  <Component as={Link} to="home">Hello world!</Component>
  ```

### Breaking changes

- Fix how ampersand is handled in self-referential selector combinations, e.g. `& + &` (see [#2071](https://github.com/styled-components/styled-components/pull/2071))

- Remove deprecated `consolidateStreamedStyles` API, by [@probablyup](https://github.com/probablyup) (see [#1906](https://github.com/styled-components/styled-components/pull/1906))

- Remove deprecated `jsnext:main` entry point from package.json, by [@probablyup](https://github.com/probablyup) (see [#1907](https://github.com/styled-components/styled-components/pull/1907))

- Remove deprecated `.extend` API, by [@probablyup](https://github.com/probablyup) (see [#1908](https://github.com/styled-components/styled-components/pull/1908))

- Migrate to new context API, by [@alexandernanberg](https://github.com/alexandernanberg) (see [#1894](https://github.com/styled-components/styled-components/pull/1894))

- Remove TS typings; they are now to be found in DefinitelyTyped, by [@probablyup](https://github.com/probablyup). See https://github.com/styled-components/styled-components/issues/1778 for more information.

- Add new `data-styled-version` attribute to generated `<style>` tags to allow multiple versions of styled-components to function on the page at once without clobbering each other, by [@probablyup](https://github.com/probablyup)

  It's still highly recommended to use aliasing via your bundler to dedupe libraries like styled-components and react.

- [Breaking change] Refactor `keyframes` helper, by [@fer0x](https://github.com/Fer0x) (see [#1930](https://github.com/styled-components/styled-components/pull/1930)).

  Keyframes is now implemented in a "lazy" manner: its styles will be injected with the render phase of components using them.

  `keyframes` no longer returns an animation name, instead it returns an object which has method `.getName()` for the purpose of getting the animation name.

- Migrate to use new `React.forwardRef` API, by [@probablyup](https://github.com/probablyup); note that this removes the `innerRef` API since it is no longer needed.

- Implement `styled()` wrapper folding. In a nutshell, when you nest styled wrappers (e.g. `styled(styled.div)`) the components are now folded such that only one is mounted that contains the merged styles of its ancestors. This is conceptually equivalent to the removed "extend" functionality, but without many of the downsides -- and it's automatic, by [@probablyup](https://github.com/probablyup) (see [#1962](https://github.com/styled-components/styled-components/pull/1962))

### Developer experience improvements

- Add warning when component is not a styled component and cannot be referred via component selector, by [@egdbear](https://github.com/egdbear) (see [#2070](https://github.com/styled-components/styled-components/pull/2070))

  When using CRA v2, import styled components from `styled-components/macro` instead to gain all the benefits of [our babel plugin](https://github.com/styled-components/babel-plugin-styled-components).

- Add a warning when wrapping a React component with `styled()` and the `className` isn't used (meaning styling isn't applied), by [@Fer0x](https://github.com/Fer0x) (see [#2073](https://github.com/styled-components/styled-components/pull/2073))

- Tweak the styled components base component naming to look nicer in DevTools, by [@probablyup](https://github.com/probablyup) (see [#2012](https://github.com/styled-components/styled-components/pull/2012))

- Beef up the error message that sometimes occurs when multiple versions of styled components are used together and the StyleSheet instance can't be found, by [@probablyup](https://github.com/probablyup) (see [#2012](https://github.com/styled-components/styled-components/pull/2012))

### Misc

- Add `enzymeFind` test utility to easily grab instances of a styled-component from enyzme mounted testing scenarios, by [@probablyup](https://github.com/probablyup) (see [#2049](https://github.com/styled-components/styled-components/pull/2049))

  ```js
  import { mount } from 'enzyme';
  import React from 'react';
  import styled from 'styled-components';
  import { enzymeFind } from 'styled-components/test-utils';

  const Thing = styled.div`
    color: red;
  `;

  const wrapper = mount(
    <div>
      <Thing isCool />
    </div>
  );

  const thing = enzymeFind(wrapper, Thing);

  // expect(thing.props()).toHaveProperty('isCool') etc
  ```

- Inline and optimize the static hoisting functionality to avoid a bundler bug and shed a bit of package weight, by [@probablyup](https://github.com/probablyup) (see [#2021](https://github.com/styled-components/styled-components/pull/2021)

## [v4.0.0-beta.11] - 2018-10-08

- Add warning when component is not a styled component and cannot be referred via component selector, by [@egdbear](https://github.com/egdbear) (see [#2070](https://github.com/styled-components/styled-components/pull/2070))

- Fix how ampersand is handled in self-referential selector combinations, e.g. `& + &` (see [#2071](https://github.com/styled-components/styled-components/pull/2071))

- Add babel macro for full-featured interop with create react app v2+, by [@lucleray](https://github.com/lucleray) (see [#2032](https://github.com/styled-components/styled-components/pull/2032))

  When using CRA v2, import styled components from `styled-components/macro` instead to gain all the benefits of [our babel plugin](https://github.com/styled-components/babel-plugin-styled-components).

- Add a warning when wrapping a React component with `styled()` and the `className` isn't used (meaning styling isn't applied), by [@Fer0x](https://github.com/Fer0x) (see [#2073](https://github.com/styled-components/styled-components/pull/2073))

## [v4.0.0-beta.10] - 2018-10-04

- Add support for `as` to be used with `attrs` for better polymorphism, by [@imbhargav5](https://github.com/imbhargav5) (see [#2055](https://github.com/styled-components/styled-components/pull/2055))

- Fix `withTheme` HOC to use a theme defined in `defaultProps` of the wrapped component, by [@theboyWhoCriedWoolf](https://github.com/theboyWhoCriedWoolf) (see [#2033](https://github.com/styled-components/styled-components/pull/2033))

- Add `enzymeFind` test utility to easily grab instances of a styled-component from enyzme mounted testing scenarios, by [@probablyup](https://github.com/probablyup) (see [#2049](https://github.com/styled-components/styled-components/pull/2049))

```js
import { mount } from 'enzyme';
import React from 'react';
import styled from 'styled-components';
import { enzymeFind } from 'styled-components/test-utils';

const Thing = styled.div`
  color: red;
`;

const wrapper = mount(
  <div>
    <Thing isCool />
  </div>
);

const thing = enzymeFind(wrapper, Thing);

// expect(thing.props()).toHaveProperty('isCool') etc
```

## [v4.0.0-beta.9] - 2018-09-24

- Fix usage of `keyframes` with `createGlobalStyle`, by [@probablyup](https://github.com/probablyup) (see [#2029](https://github.com/styled-components/styled-components/pull/2029))

## [v4.0.0-beta.8] - 2018-09-20

- Inline and optimize the static hoisting functionality to avoid a bundler bug and shed a bit of package weight, by [@probablyup](https://github.com/probablyup) (see [#2021](https://github.com/styled-components/styled-components/pull/2021))

## [v4.0.0-beta.7] - 2018-09-18

- Revise createGlobalStyle HMR back to the original PR code without using `componentDidMount`, by [@probablyup](https://github.com/probablyup) (see [#2017](https://github.com/styled-components/styled-components/pull/2017))

- Some light refactoring to further reduce object allocations, by [@probablyup](https://github.com/probablyup) (see [#2016](https://github.com/styled-components/styled-components/pull/2016))

## [v4.0.0-beta.6] - 2018-09-17

- Fix a bug introduced from some refactoring that went into beta.5 around usage of `keyframes` with multiple interpolations, by [@probablyup](https://github.com/probablyup) (see [#2013](https://github.com/styled-components/styled-components/pull/2013))

- Tweak the styled components base component naming to look nicer in DevTools, by [@probablyup](https://github.com/probablyup) (see [#2012](https://github.com/styled-components/styled-components/pull/2012))

- Beef up the error message that sometimes occurs when multiple versions of styled components are used together and the StyleSheet instance can't be found, by [@probablyup](https://github.com/probablyup) (see [#2012](https://github.com/styled-components/styled-components/pull/2012))

## [v4.0.0-beta.5] - 2018-09-14

- Fix issue with `createGlobalStyle` and hot module reload, by [@probablyup](https://github.com/probablyup) (see [#2007](https://github.com/styled-components/styled-components/pull/2007))

- Remove keyframes factory function, by [@probablyup](https://github.com/probablyup) (see [#2006](https://github.com/styled-components/styled-components/pull/2006))

## [v4.0.0-beta.4] - 2018-09-12

- Use PureComponent instead of Component for the StyledComponent base class, by [@probablyup](https://github.com/probablyup)

- Internal refactoring to simplify the codebase and make it more readily DCE-able, by [@probablyup](https://github.com/probablyup)

## [v4.0.0-beta.3] - 2018-09-10

- Fix an issue when streaming with very large amounts of output where sometimes styles might not make it to the client, by [@probablyup](https://github.com/probablyup) (see [#1996](https://github.com/styled-components/styled-components/pull/1996))

- Fix the `createGlobalStyle` multiusage warning having false positives, by [@probablyup](https://github.com/probablyup) (see [#1993](https://github.com/styled-components/styled-components/pull/1993))

## [v4.0.0-beta.2] - 2018-09-09

- Expose `ThemeConsumer` component, context consumer render prop component from the `React.createContext` API if people are interested in using it rather than / in addition to the `withTheme` HOC, by [@probablyup](https://github.com/probablyup)

- Remove "no tags" experiment, by [@probablyup](https://github.com/probablyup) (see [#1987](https://github.com/styled-components/styled-components/pull/1987))

- Fixed an issue with `createGlobalStyle` when the component was composed in multiple places and render of the subsequent component instance happened before unmount of the original; previously we removed styles immediately upon unmount of any instance without checking how many copies were still alive, by [@probablyup](https://github.com/probablyup) (see [#1989](https://github.com/styled-components/styled-components/pull/1989))

## [v4.0.0-beta.1] - 2018-09-06

- Fixed an issue where `createGlobalStyle` was clobbering the very next style to be applied during rehydration in production mode, by [@probablyup](https://github.com/probablyup) (see [#1976](https://github.com/styled-components/styled-components/pull/1976))

- Removed some unused code, by [@probablyup](https://github.com/probablyup) (see [#1976](https://github.com/styled-components/styled-components/pull/1976))

- Switched `createGlobalStyle` to be a `PureComponent`, by [@probablyup](https://github.com/probablyup) (see [#1976](https://github.com/styled-components/styled-components/pull/1976))

## [v4.0.0-beta.0] - 2018-09-04

- Remove deprecated `consolidateStreamedStyles` API, by [@probablyup](https://github.com/probablyup) (see [#1906](https://github.com/styled-components/styled-components/pull/1906))

- Remove deprecated `jsnext:main` entry point from package.json, by [@probablyup](https://github.com/probablyup) (see [#1907](https://github.com/styled-components/styled-components/pull/1907))

- Remove deprecated `.extend` API, by [@probablyup](https://github.com/probablyup) (see [#1908](https://github.com/styled-components/styled-components/pull/1908))

- Migrate to new context API, by [@alexandernanberg](https://github.com/alexandernanberg) (see [#1894](https://github.com/styled-components/styled-components/pull/1894))

- Remove TS typings; they are now to be found in DefinitelyTyped, by [@probablyup](https://github.com/probablyup). See https://github.com/styled-components/styled-components/issues/1778 for more information.

- Add new `data-styled-version` attribute to generated `<style>` tags to allow multiple versions of styled-components to function on the page at once without clobbering each other, by [@probablyup](https://github.com/probablyup)

  It's still highly recommended to use aliasing via your bundler to dedupe libraries like styled-components and react.

- [Breaking change] Refactor `keyframes` helper, by [@fer0x](https://github.com/Fer0x) (see [#1930](https://github.com/styled-components/styled-components/pull/1930)).

  Keyframes is now implemented in a "lazy" manner: its styles will be injected with the render phase of components using them.

  `keyframes` no longer returns an animation name, instead it returns an object which has method `.getName()` for the purpose of getting the animation name.

* Add `createGlobalStyle` that returns a component which, when mounting, will apply global styles. This is a replacement for the `injectGlobal` API. It can be updated, replaced, removed, etc like any normal component and the global scope will update accordingly, by [@JamieDixon](https://github.com/JamieDixon) [@marionebl](https://github.com/marionebl), [@yjimk](https://github.com/yjimk), and [@imbhargav5](https://github.com/imbhargav5) (see [#1416](https://github.com/styled-components/styled-components/pull/1416))

  ```jsx
  const GlobalStyles = createGlobalStyle`
    html {
      color: 'red';
    }
  `;

  // then put it in your React tree somewhere:
  // <GlobalStyles />
  ```

- Migrate to use new `React.forwardRef` API, by [@probablyup](https://github.com/probablyup); note that this removes the `innerRef` API since it is no longer needed.

- Implement `styled()` wrapper folding. In a nutshell, when you nest styled wrappers (e.g. `styled(styled.div)`) the components are now folded such that only one is mounted that contains the merged styles of its ancestors. This is conceptually equivalent to the removed "extend" functionality, but without many of the downsides -- and it's automatic, by [@probablyup](https://github.com/probablyup) (see [#1962](https://github.com/styled-components/styled-components/pull/1962))

- Added a first-class API for rendering polymorphism via "as" prop. In most cases, this new prop will replace your need to use the `.withComponent` API. It allows you to control what underlying element or component is rendered at runtime, while not messing with the styles, by [@probablyup](https://github.com/probablyup) (see [#1962](https://github.com/styled-components/styled-components/pull/1962))

  ```jsx
  import { Link } from 'react-router'

  const Component = styled.div`
    color: red;
  `

  // Examples
  <Component>Hello world!</Component>
  <Component as="span">Hello world!</Component>
  <Component as={Link} to="home">Hello world!</Component>
  ```

## [3.4.10] - 2018-10-09

- Added a few iframe attributes to the valid attribute list: `allow`, `allowUserMedia`, `allowPaymentRequest`, by [@asoltys](https://github.com/asoltys) (see [#2083](https://github.com/styled-components/styled-components/pull/2083) and [#2085](https://github.com/styled-components/styled-components/pull/2085))

## [v3.4.9] - 2018-09-18

- Remove the `injectGlobal` warning; it's not actionable since the replacement API is in v4 only, so why say anything?

## [v3.4.8] - 2018-09-17

- Fix the `injectGlobal` warning not being properly guarded for production, by [@probablyup](https://github.com/probablyup)

## [v3.4.7] - 2018-09-17

- Add warning for the upcoming removal of the `injectGlobal` API in v4.0, by [@rainboxx](https://github.com/rainboxx) (see [#1867](https://github.com/styled-components/styled-components/pull/1867))

- Backport from v4: Beef up the error message that sometimes occurs when multiple versions of styled components are used together and the StyleSheet instance can't be found, by [@probablyup](https://github.com/probablyup) (see [#2012](https://github.com/styled-components/styled-components/pull/2012))

## [v3.4.6] - 2018-09-10

- Fix an issue when streaming with very large amounts of output where sometimes styles might not make it to the client, by [@probablyup](https://github.com/probablyup) (see [#1997](https://github.com/styled-components/styled-components/pull/1997))

## [v3.4.5] - 2018-08-23

- Tone down the dev warnings for deprecated APIs (they were `console.error`, now `console.warn`), by [@probablyup](https://github.com/probablyup)

## [v3.4.4] - 2018-08-21

- Fix warning function not having a production fallback, by [@mitoyarzun](https://github.com/mitoyarzun) (see [#1938](https://github.com/styled-components/styled-components/pull/1938))

## [v3.4.3] - 2018-08-21

- Add warning for the upcoming removal of the `extend` API in v4.0, by [@probablyup](https://github.com/probablyup) (see [#1909](https://github.com/styled-components/styled-components/pull/1909))

- Throw Error if a React component was mistakenly interpolated within styles, by [@imbhargav5](https://github.com/imbhargav5) (see [#1883](https://github.com/styled-components/styled-components/pull/1883))

- Fix the primitives build, by [@probablyup](https://github.com/probablyup) (see [24f097](https://github.com/styled-components/styled-components/commit/24f097e3d342a1ab3db3ff68b81cc7d172e7dd0b))

## [v3.4.2] - 2018-08-07

- Fix a regression from [#1843](https://github.com/styled-components/styled-components/pull/1892) that breaks deferred injection and duplicates rules, by [@kitten](https://github.com/kitten) (see [#1892](https://github.com/styled-components/styled-components/pull/1892))

- [TS] Fix missing generic type arguments in .d.ts, by [@PzYon](https://github.com/PzYon) (see [#1886](https://github.com/styled-components/styled-components/pull/1886))

## [v3.4.1] - 2018-08-04

- Fixed a bug in typings where `isStyledComponent` was defined using an undefined variable, by [@MayhemYDG](https://github.com/MayhemYDG) (see [#1876](https://github.com/styled-components/styled-components/pull/1876))

- Add error system, by [@probablyup](https://github.com/probablyup) (see [#1881](https://github.com/styled-components/styled-components/pull/1881))

- Fix "stream" module not being properly eliminated by rollup, by [@probablyup](https://github.com/probablyup)

## [v3.4.0] - 2018-08-02

- Add first-class support for functions that return objects, by [@acjay](https://github.com/acjay) (see [#1820](https://github.com/styled-components/styled-components/pull/1820))

  ```JS
  const Comp = styled.div((({ color }) => ({
    color,
  }))
  ```

- Add support for the prop variants used by Preact (`autofocus`, `class`, `for`), by [@probablyup](https://github.com/probablyup) (see [#1823](https://github.com/styled-components/styled-components/pull/1823))

- Various performance improvements, by [@probablyup](https://github.com/probablyup) (see [#1843](https://github.com/styled-components/styled-components/pull/1843))

- [TS] Revert #1798, by [@Igorbek](https://github.com/Igorbek) (see [#1840](https://github.com/styled-components/styled-components/pull/1840))

- [Internal] Add benchmarking suite, by [@mxstbr](https://github.com/mxstbr) (see [#1833](https://github.com/styled-components/styled-components/pull/1833))

## [v3.3.3] - 2018-06-20

- Fixed a regression when extending a `styled(StyledComponent)` introduced in 3.3.0, by [@probablyup](https://github.com/probablyup) (see [#1819](https://github.com/styled-components/styled-components/pull/1819))

- Adjust how displayName is generated when not using Babel to properly preserve a displayName passed via `withConfig`, by [@probablyup](https://github.com/probablyup) (see [#1755](https://github.com/styled-components/styled-components/pull/1755))

- [TS] Fix props being removed when indexed types are passed to WithOptionalTheme, by [@devrelm](https://github.com/devrelm) (see [#1806](https://github.com/styled-components/styled-components/pull/1806))

- [TS] Allow TypeScript 2.9.1 to accept tagged template type argument, by [@Igorbek](https://github.com/Igorbek) (see [#1798](https://github.com/styled-components/styled-components/pull/1798))

- Add ref documentation for React.createRef(), by [@julmot](https://github.com/julmot) (see [#1792](https://github.com/styled-components/styled-components/pull/1792))

## [v3.3.2] - 2018-06-04

- Allow non-plain objects as `ThemeProvider` themes, by [@phyllisstein](https://github.com/phyllisstein) (see [#1780](https://github.com/styled-components/styled-components/pull/1780))

- Upgrade flow-bin to latest, by [@halvves](https://github.com/halvves) (see [#1748](https://github.com/styled-components/styled-components/pull/1748))

- Update various CI bits, by [@probablyup](https://github.com/probablyup) (see [#1769](https://github.com/styled-components/styled-components/pull/1769))

- Reimplement SSR stream handling as a transform stream rather than a second-order readable stream, by [@probablyup](https://github.com/probablyup) (see [#1768](https://github.com/styled-components/styled-components/pull/1768))

- Allow React Component as attr, by [@valerybugakov](https://github.com/valerybugakov) (see [#1751](https://github.com/styled-components/styled-components/pull/1751))

- Added pointer events to valid attributes check, by [@plankguy](https://github.com/plankguy) (see [#1790](https://github.com/styled-components/styled-components/pull/1790))

_v3.3.1 was skipped due to a bad deploy._

## [v3.3.0] - 2018-05-25

- Fix off-by-one error in insertRuleHelpers.js, by [@migueloller](https://github.com/migueloller) (see [#1749](https://github.com/styled-components/styled-components/pull/1749))

- Add first-class support for objects, by [@mxstbr](https://github.com/mxstbr) (see [#1732](https://github.com/styled-components/styled-components/pull/1732))

  ```JS
  const Component = styled.div({
    color: 'blue'
  })
  ```

* Fix typo in console warning about multiple instances, by [@lucianbuzzo](https://github.com/lucianbuzzo) (see [#1730](https://github.com/styled-components/styled-components/pull/1730))

* Make the multiple instance warning criteria a little more strict to avoid badgering people running unit tests, by [@probablyup](https://github.com/probablyup) (see [#1693](https://github.com/styled-components/styled-components/pull/1693))

* Fix `React.createRef()` values for `innerRef` being ignored in React Native, by [@simonbuchan](https://github.com/simonbuchan) (see [#1718](https://github.com/styled-components/styled-components/pull/1718))

* Hoist non-react static properties on wrapped classes, by [@probablyup](https://github.com/probablyup) (see [#1750](https://github.com/styled-components/styled-components/pull/1750))

* Support attributes prefixed by `x-`, by [@mlecoq](https://github.com/mlecoq) (see [#1753](https://github.com/styled-components/styled-components/pull/1753))

## [v3.2.6] - 2018-04-17

- Fix `cascade: false` being erroneously set on the Stylis rule splitter (see [#1677](https://github.com/styled-components/styled-components/pull/1677))

- Fix typo in `ComponentStyle.js` comments (see [#1678](https://github.com/styled-components/styled-components/pull/1678))

- Accept ref forwarding components in styled constructor (see [#1658](https://github.com/styled-components/styled-components/pull/1658))

- Fix onInvalid check in validAttrs, by [@slootsantos](https://github.com/slootsantos) (see [#1668](https://github.com/styled-components/styled-components/pull/1668))

- Fix `makeSpeedyTag`'s css method (see [#1663](https://github.com/styled-components/styled-components/pull/1663))

- Fix ComponentStyle caching strategy to take StyleSheet cache into account, by [@darthtrevino](https://github.com/darthtrevino) (see [#1634](https://github.com/styled-components/styled-components/pull/1634))

- Add new `test-utils` to simplify finding styled-components in the DOM in unit testing scenarios, by [@jamiebuilds](https://github.com/jamiebuilds) (see [#1652](https://github.com/styled-components/styled-components/pull/1652))

- Add minified commonjs and esm builds for bundle size tracking (see [#1681](https://github.com/styled-components/styled-components/pull/1681))

## [v3.2.5] - 2018-03-30

- Deprecate experimental preprocess mode, by [@Samatar26](https://github.com/Samatar26) (see [#1619](https://github.com/styled-components/styled-components/issues/1619))
- Added ability to override `SC_ATTR` via `process.env.SC_ATTR` (see [#1632](https://github.com/styled-components/styled-components/pull/1632))

## [v3.2.3] - 2018-03-14

- Fix SSR memory leak where StyleSheet clones are never freed (see [#1612](https://github.com/styled-components/styled-components/pull/1612))

## [v3.2.2] - 2018-03-13

- Fix ServerTag.clone() not properly cloning its names and markers (see [#1605](https://github.com/styled-components/styled-components/pull/1605))

- Fix nested media at-rules by upgrading to stylis@^3.5.0 and stylis-rule-sheet@^0.0.10 (see [#1595](https://github.com/styled-components/styled-components/pull/1595))

- Fix the `IS_BROWSER` check to work more reliably in projects where `window` may be shimmed, by [@danieldunderfelt](https://github.com/danieldunderfelt) (see [#1599](https://github.com/styled-components/styled-components/pull/1599))

## [v3.2.1] - 2018-03-07

- Fix `@import` rules not being enforced to appear at the beginning of stylesheets (see [#1577](https://github.com/styled-components/styled-components/pull/1577))

- Fix StyleTags toElement outputting inline CSS which would cause URL encoding (see [#1580](https://github.com/styled-components/styled-components/pull/1580))

## [v3.2.0] - 2018-03-05

- Remove `type="text/css"`-attribute from style tag to remove warnings from w3c validator (see [#1551](https://github.com/styled-components/styled-components/pull/1551))

- Add `foreignObject` svg element (see [#1544](https://github.com/styled-components/styled-components/pull/1544))

- Add `controlsList` to validAttr list (see [#1537](https://github.com/styled-components/styled-components/pull/1537))

- Enable stylis' semicolon autocompletion which was accidentally disabled for a lot of prior releases (see [#1532](https://github.com/styled-components/styled-components/pull/1532))

- Fix `insertRule` injection (speedy mode in production) of nested media queries by upgrading stylis-rule-sheet (see [#1529](https://github.com/styled-components/styled-components/pull/1529) and [#1528](https://github.com/styled-components/styled-components/pull/1528))

- Add `StyleSheet.remove` API method to be able to delete rules related to a component (see [#1514](https://github.com/styled-components/styled-components/pull/1514))

- Replace murmurhash implementation and avoid destructuring tag function arguments (see [#1516](https://github.com/styled-components/styled-components/pull/1516))

- Rewrite and refactor `StyleSheet` and `ServerStyleSheet` (no breaking change, see [#1501](https://github.com/styled-components/styled-components/pull/1501))

- Add warning if there are several instances of `styled-components` initialized on the page (see [#1412](https://github.com/styled-components/styled-components/pull/1412))

- Add `target` prop to `StyleSheetManager` component to enable specifying where style tags should render (see [#1491](https://github.com/styled-components/styled-components/pull/1491))

## [v3.1.6] - 2018-02-03

- Bugfix for the last style tag sometimes being emitted multiple times during streaming (see [#1479](https://github.com/styled-components/styled-components/pull/1479))

- Bugfix for speedy mode rehydration and added handling for out-of-order style injection (see [#1482](https://github.com/styled-components/styled-components/pull/1482))

## [v3.1.5] - 2018-02-01

- Apply a workaround to re-enable "speedy" mode for IE/Edge (see [#1468](https://github.com/styled-components/styled-components/pull/1468))

- Fix memory leak in the server-side streaming logic (see [#1475](https://github.com/styled-components/styled-components/pull/1475))

## [v3.1.4] - 2018-01-29

- Disable "speedy" mode for IE and Edge. There seems to be some incompatibility with how the `insertRule` API functions in their rendering stack compared to the other vendors. (see [#1465](https://github.com/styled-components/styled-components/pull/1465))

## [v3.1.3] - 2018-01-29

- Disable "speedy" mode for non-production environments, fixes `jest-styled-components` compatibility (see [#1460](https://github.com/styled-components/styled-components/pull/1460))

## [v3.1.1] - 2018-01-29

- Hotfix for importing in ReactNative, thanks to [@vvasilev-](https://github.com/vvasilev-) (see [#1455](https://github.com/styled-components/styled-components/pull/1455))

## [v3.1.0] - 2018-01-29

- Compile out error messages for production builds (see [#1445](https://github.com/styled-components/styled-components/pull/1445))
- Use much faster CSS injection in the browser, by [@schwers](https://github.com/schwers) and [@philpl](https://github.com/philpl) (see [#1208](https://github.com/styled-components/styled-components/pull/1208))
- Add support for streaming server-side rendering, by [@probablyup](https://github.com/probablyup) (see [#1430](https://github.com/styled-components/styled-components/pull/1430))

## [v3.0.2] - 2018-01-22

- Add secret internals for jest-styled-components (do not use or you will be haunted by spooky ghosts :ghost:) (see [#1438](https://github.com/styled-components/styled-components/pull/1438))

## [v3.0.1] - 2018-01-22

- Add support for SafeAreaView when using styled-components in a React Native project (see [#1339](https://github.com/styled-components/styled-components/pull/1339))

- Remove support for deprecated Navigator when using styled-components in a React Native project (see [#1339](https://github.com/styled-components/styled-components/pull/1339))

- Ship flat bundles for each possible entry, thanks to [@Andarist](https://github.com/Andarist) (see [#1362](https://github.com/styled-components/styled-components/pull/1362))

- Add ESLint precommit hook, thanks to [@lukebelliveau](https://github.com/lukebelliveau) (see [#1393](https://github.com/styled-components/styled-components/pull/1393))

- Fixed nested themes not being republished on outer theme changes, thanks to [@Andarist](https://github.com/Andarist) (see [#1382](https://github.com/styled-components/styled-components/pull/1382))

- Add warning if you've accidently imported 'styled-components' on React Native instead of 'styled-components/native', thanks to [@tazsingh](https://github.com/tazsingh) and [@gribnoysup](https://github.com/gribnoysup) (see [#1391](https://github.com/styled-components/styled-components/pull/1391) and [#1394](https://github.com/styled-components/styled-components/pull/1394))

- Fixed bug where `innerRef` could be passed as undefined to components when using withTheme. This could cause issues when using prop spread within the component (e.g. `{...this.props}`), because React will still warn you about using a non-dom prop even though it's undefined. (see [#1414](https://github.com/styled-components/styled-components/pull/1414))

- Expose `isStyledComponent` utility as a named export. This functionality is useful in some edge cases, such as knowing whether or not to use `innerRef` vs `ref` and detecting if a component class needs to be wrapped such that it can be used in a component selector. (see [#1418](https://github.com/styled-components/styled-components/pull/1418/))

- Remove trailing commas on function arguments (not compatible with ES5 JS engines)

- Ship source maps (see [#1425](https://github.com/styled-components/styled-components/pull/1425))

- Upgrade test suites to run against react v16 (see [#1426](https://github.com/styled-components/styled-components/pull/1426))

- Streaming rendering support (requires React 16, see [#1430](https://github.com/styled-components/styled-components/pull/1430))

## [v2.4.0] - 2017-12-22

- remove some extra information from the generated hash that can differ between build environments (see [#1381](https://github.com/styled-components/styled-components/pull/1381))

## [v2.3.3] - 2017-12-20

- Fix the attr filtering optimization removed in v2.3.2; bundle size improvement, thanks to [@probablyup](https://github.com/probablyup) (see [#1377](https://github.com/styled-components/styled-components/pull/1377))
- Move last bits of docs from the README to the website, thanks to [@Carryon](https://github.com/Carryon), [@SaraVieira](https://github.com/SaraVieira) and [@JamesJefferyUK](https://github.com/JamesJefferyUK)

## [v2.3.2] - 2017-12-19

- Hotfix a bug in the attr filtering in v2.3.1 (see [#1372](https://github.com/styled-components/styled-components/pull/1371))

## [v2.3.1] - 2017-12-19

- Create styled-components badge, thanks to [@iRoachie](https://github.com/iRoachie) (see [#1363](https://github.com/styled-components/styled-components/issues/1363))
- Library size reductions, thanks to [@probablyup](https://github.com/probablyup) (see [#1365](https://github.com/styled-components/styled-components/pull/1365))
- Add Prettier, thanks to [@existentialism](https://github.com/existentialism) (see [#593](https://github.com/styled-components/styled-components/pull/593))
- Fix unminified UMD build, thanks to [@maciej-ka](https://github.com/maciej-ka) (see [#1355](https://github.com/styled-components/styled-components/issues/1355))
- Update the contribution and community guidelines, see the [CONTRIBUTING.md](./CONTRIBUTING.md)

## [v2.3.0] - 2017-12-15

- Add development sandbox to repo for easier contributing, thanks to [@gribnoysup](https://github.com/gribnoysup) (see [#1257](https://github.com/styled-components/styled-components/pull/1257))
- Add basic support for style objects in the Typescript definitions, thanks to [@nbostrom](https://github.com/nbostrom) (see [#1123](https://github.com/styled-components/styled-components/pull/1123))
- Fix ref warning using withTheme HOC and stateless function components, thanks to [@MatthieuLemoine](https://github.com/MatthieuLemoine) (see [#1205](https://github.com/styled-components/styled-components/pull/1205))
- Consistently escape displayNames when creating `componentId`, thanks to [@evan-scott-zocdoc](https://github.com/evan-scott-zocdoc) (see [#1313](https://github.com/styled-components/styled-components/pull/1313))
- Better issue template (see [#1342](https://github.com/styled-components/styled-components/pull/1342))

## [v2.2.4] - 2017-11-29

- Disable static styles caching when hot module replacement is enabled.
- Bump minimum `stylis` version to 3.4.0, adjust the semver caret target (see [#1296](https://github.com/styled-components/styled-components/pull/1296))

## [v2.2.3] - 2017-10-29

- Fix incorrect StyledNativeComponent#componentWillReceiveProps implementation (see [#1276](https://github.com/styled-components/styled-components/pull/1276))

## [v2.2.2] - 2017-10-24

- Prevent `withTheme` HOC from breaking when passing a theme from `defaultProps`, thanks to [@kutyel](https://github.com/kutyel) (see [#1130](https://github.com/styled-components/styled-components/pull/1130))
- Refactor out theme logic in StyledComponent's componentWillMount & componentWillReceiveProps (see [#1130](https://github.com/styled-components/styled-components/issues/1130))
- Add onReset to valid react props list (see [#1234](https://github.com/styled-components/styled-components/pull/1234))
- Add support for ServerStyleSheet PropType in both StyleSheetManager and StyledComponent (see [#1245](https://github.com/styled-components/styled-components/pull/1245))
- Prevent component styles from being static if `attrs` are dynamic (see [#1219](https://github.com/styled-components/styled-components/pull/1219))
- Changed 'too many classes' error to recommend attrs for frequently changed styles (see [#1213](https://github.com/styled-components/styled-components/pull/1213))

## [v2.2.1] - 2017-10-04

- Cache static classnames in browser environments, thanks to [@schwers](https://github.com/schwers) (see [#1069]https://github.com/styled-components/styled-components/pull/1069))
- Move the list of libraries built with styled-components to [`awesome-styled-components`](https://github.com/styled-components/awesome-styled-components), thanks to [@romellogood](https://github.com/romellogood) (see [#1203](https://github.com/styled-components/styled-components/pull/1203))
- Don't emit empty rules like from interpolations, thanks to [@wmertens](https://github.com/wmertens) (see [#1149](https://github.com/styled-components/styled-components/pull/1149))

## [v2.2.0] - 2017-09-27

- Fixed downstream minification issue with replacing `process` (see [#1150](https://github.com/styled-components/styled-components/pull/1150))
- Fixed nonce missing from global styles (see [#1088](https://github.com/styled-components/styled-components/pull/1088))
- Improve component mount and unmount performance with changes to `createBroadcast`. Deprecates usage of `CHANNEL` as a function, will be update to `CHANNEL_NEXT`'s propType in a future version. (see [#1048](https://github.com/styled-components/styled-components/pull/1048))
- Fixed comments in react-native (see [#1041](https://github.com/styled-components/styled-components/pull/1041))
- Add support for the `__webpack_nonce__` CSP attribute (see [#1022](https://github.com/styled-components/styled-components/pull/1022) and [#1043](https://github.com/styled-components/styled-components/pull/1043))
- Add react-native `ImageBackground` alias (see [#1028](https://github.com/styled-components/styled-components/pull/1028))
- Refactor variable in generateAlphabeticName.js (see [#1040](https://github.com/styled-components/styled-components/pull/1040))
- Enable the Node environment for SSR tests, switch some output verification to snapshot testing (see [#1023](https://github.com/styled-components/styled-components/pull/1023))
- Add .extend and .withComponent deterministic ID generation (see [#1044](https://github.com/styled-components/styled-components/pull/1044))
- Add `marquee` tag to domElements (see [#1167](https://github.com/styled-components/styled-components/pull/1167))

## [v2.1.1] - 2017-07-03

- Upgrade stylis to 2.3 and use constructor to fix bugs with multiple libs using stylis simultaneously (see [#962](https://github.com/styled-components/styled-components/pull/962))

## [v2.1.0] - 2017-06-15

- Added missing v2.0 APIs to TypeScript typings, thanks to [@patrick91](https://github.com/patrick91), [@igorbek](https://github.com/igorbek) (see [#837](https://github.com/styled-components/styled-components/pull/837), [#882](https://github.com/styled-components/styled-components/pull/882))
- Added [`react-primitives`](https://github.com/lelandrichardson/react-primitives) target, thanks to [@mathieudutour](https://github.com/mathieudutour) (see [#904](https://github.com/styled-components/styled-components/pull/904)
- Various minor fixes: [#886](https://github.com/styled-components/styled-components/pull/886), [#898](https://github.com/styled-components/styled-components/pull/898), [#902](https://github.com/styled-components/styled-components/pull/902), [#915](https://github.com/styled-components/styled-components/pull/915)

## [v2.0.1] - 2017-06-07

- Fixed `extend` not working with 3 or more inheritances, thanks to [@brunolemos](https://twitter.com/brunolemos). (see [#871](https://github.com/styled-components/styled-components/pull/871))
- Added a test for `withComponent` followed by `attrs`, thanks to [@btmills](https://github.com/btmills). (see [#851](https://github.com/styled-components/styled-components/pull/851))
- Fix Flow type signatures for compatibility with Flow v0.47.0 (see [#840](https://github.com/styled-components/styled-components/pull/840))
- Upgraded stylis to v3.0. (see [#829](https://github.com/styled-components/styled-components/pull/829) and [#876](https://github.com/styled-components/styled-components/pull/876))
- Remove dead code used previously for auto-prefixing. (see [#881](https://github.com/styled-components/styled-components/pull/881))

## [v2.0.0] - 2017-05-25

- Update css-to-react-native - you'll now need to add units to your React Native styles (see [css-to-react-native](https://github.com/styled-components/css-to-react-native/issues/20), [code mod](https://github.com/styled-components/styled-components-native-code-mod))
- Update stylis to latest version (see [#496](https://github.com/styled-components/styled-components/pull/496)).
- Added per-component class names (see [#227](https://github.com/styled-components/styled-components/pull/227)).
- Added the ability to override one component's styles from another.
- Injecting an empty class for each instance of a component in development.
- Added `attrs` constructor for passing extra attributes/properties to the underlying element.
- Added warnings for components generating a lot of classes, thanks to [@vdanchenkov](https://github.com/vdanchenkov). (see [#268](https://github.com/styled-components/styled-components/pull/268))
- Standardised `styled(Comp)` to work the same in all cases, rather than a special extension case where `Comp` is another Styled Component. `Comp.extend` now covers that case. (see [#518](https://github.com/styled-components/styled-components/pull/518)).
- Added `Comp.withComponent(Other)` to allow cloning of an existing SC with a new tag. (see [#814](https://github.com/styled-components/styled-components/pull/814).
- Added a separate `no-parser` entrypoint for preprocessed CSS, which doesn't depend on stylis. The preprocessing is part of our babel plugin. (see [babel-plugin-styled-components/#26](https://github.com/styled-components/babel-plugin-styled-components/pull/26))
- Fix defaultProps used instead of ThemeProvider on first render [@k15a](https://github.com/k15a), restored.
- Refactor StyledComponent for performance optimization.
- Prevent leakage of the `innerRef` prop to wrapped child; under the hood it is converted into a normal React `ref`. (see [#592](https://github.com/styled-components/styled-components/issues/592))
- Pass `innerRef` through to wrapped Styled Components, so that it refers to the actual DOM node. (see [#629](https://github.com/styled-components/styled-components/issues/629))
- Added a dedicated Server-Side-Rendering API, with optimised rehydration on the client. Keys are now sequential.
- Add hoisting static (non-React) properties for withTheme HOC, thanks to [@brunolemos](https://github.com/brunolemos). (See [#712](https://github.com/styled-components/styled-components/pull/712))
- Add `innerRef` support to `withTheme` HOC. (see [#710](https://github.com/styled-components/styled-components/pull/710))
- Switch to babel-preset-env. (see [#717](https://github.com/styled-components/styled-components/pull/717))
- Update StyledNativeComponent to match StyledComponent implementation.
- Fix Theme context for StyledComponent for IE <10. (see [#807](https://github.com/styled-components/styled-components/pull/807))
- Restore `setNativeProps` in StyledNativeComponent, thanks to [@MatthieuLemoine](https://github.com/MatthieuLemoine). (see [#764](https://github.com/styled-components/styled-components/pull/764))
- Fix `ref` being passed to Stateless Functional Components in StyledNativeComponent. (see [#828](https://github.com/styled-components/styled-components/pull/828))
- Add `displayName` to `componentId` when both are present (see [#821](https://github.com/styled-components/styled-components/pull/821))
- Test node 8.x as well in travis (see [#1153](https://github.com/styled-components/styled-components/pull/1153))

## [v1.4.6] - 2017-05-02

### Added

- Support for jsdom and other browsers that do not implement [ownerNode](https://developer.mozilla.org/en-US/docs/Web/API/StyleSheet/ownerNode), thanks to [@zvictor](https://github.com/zvictor)

### Changed

- Upgrade `babel-plugin-flow-react-proptypes` to version 2.1.3, fixing prop-types warnings; thanks to [@EnoahNetzach](https://github.com/EnoahNetzach)

## [v1.4.5] - 2017-04-14

### Changed

- Migrated from the deprecated `React.PropTypes` to the `prop-types` package, thanks to [@YasserKaddour](https://github.com/YasserKaddour). (see [#668](https://github.com/styled-components/styled-components/pull/668))
- Add FlatList, SectionList & VirtualizedList support, thanks to @Kureev(https://github.com/Kureev). (see [#662](https://github.com/styled-components/styled-components/pull/662))
- Removed dependency on `glamor` and migrated remaining references to the internal vendored `glamor` module. (see [#663](https://github.com/styled-components/styled-components/pull/663))
- Fix missing autoprefixing on GlobalStyle model. (see [#702](https://github.com/styled-components/styled-components/pull/702))
- Better support for `keyframes` on older iOS/webkit browsers (see [#720](https://github.com/styled-components/styled-components/pull/720))

## [v1.4.4] — 2017-03-01

### Changed

- Improve theming support in TypeScript, thanks to [@patrick91](https://github.com/patrick91). (see [#460](https://github.com/styled-components/styled-components/pull/460))
- Add TypeScript definitions for `withTheme`, thanks to [@patrick91](https://github.com/patrick91). (see [#521](https://github.com/styled-components/styled-components/pull/521))
- Exclude test files from `npm`, thanks to [@Amwam](https://github.com/Amwam). (see [#464](https://github.com/styled-components/styled-components/pull/464))
- Change the default `displayName` to `styled(Component)`, thanks to [@k15a](https://github.com/k15a). (see [#470](https://github.com/styled-components/styled-components/pull/470))

## [v1.4.3] - 2017-02-04

### Changed

- Improve TypeScript typings, thanks to [@igorbek](https://github.com/igorbek). (see [#428](https://github.com/styled-components/styled-components/pull/428) and [#432](https://github.com/styled-components/styled-components/pull/432))
- Fix SSR bug introduced in v1.4.2, thanks to [@xcoderzach](https://github.com/xcoderzach). (see [#440](https://github.com/styled-components/styled-components/pull/440))
- Fix defaultProps used instead of ThemeProvider on first render [@k15a](https://github.com/k15a). ([#450](https://github.com/styled-components/styled-components/pull/450))
- displayName will now default to `Styled(Component)` [@k15a](https://github.com/k15a)

## [v1.4.2] - 2017-01-28

### Changed

- Fix performance issue when using `@font-face` by creating a separate `style` tag for global styles, thanks to [@xcoderzach](https://github.com/xcoderzach). (see [#415](https://github.com/styled-components/styled-components/pull/415))

## [v1.4.1] - 2017-01-27

### Changed

- Fix ReactNative throwing an error, thanks to [@lukehedger](https://github.com/lukehedger). (see [#414](https://github.com/styled-components/styled-components/pull/414))

## [v1.4.0] - 2017-01-25

### Added

- TypeScript support, thanks to [@patrick91](https://github.com/patrick91). (see [#152](https://github.com/styled-components/styled-components/pull/152))

## [v1.3.1] - 2017-01-18

### Changed

- Fix `<Styled(undefined)>` in React Developer Tools, thanks to [@iamssen](https://github.com/iamssen). (see [#383](https://github.com/styled-components/styled-components/pull/383))
- Fix themes support in IE <= 10, thanks to [@saschagehlich](https://github.com/saschagehlich). (see [#379](https://github.com/styled-components/styled-components/pull/379))
- Fixed Touchable not recognising styled components as ReactNative components, thanks to [@michalkvasnicak](https://github.com/michalkvasnicak). (see [#372](https://github.com/styled-components/styled-components/pull/372))

## [v1.3.0]

### Added

- Added `styled.Button` alias for ReactNative, thanks to [@Ginhing](https://github.com/Ginhing). (see [#322](https://github.com/styled-components/styled-components/pull/322))

### Changed

- Fix regression from previous release and only delete `innerRef` if it is being passed down to native elements, thanks to [@IljaDaderko](https://github.com/IljaDaderko). (see [#368](https://github.com/styled-components/styled-components/pull/368))
- Fixed defaultProps theme overriding ThemeProvider theme, thanks to [@diegohaz](https://github.com/diegohaz). (see [#345](https://github.com/styled-components/styled-components/pull/345))
- Removed custom flowtype suppressor in favour of default `$FlowFixMe` [@relekang](https://github.com/relekang). (see [#335](https://github.com/styled-components/styled-components/pull/335))
- Updated all dependencies to latest semver, thanks to [@amilajack](https://github.com/amilajack). (see [#324](https://github.com/styled-components/styled-components/pull/324))
- Updated all demos to link to latest version, thanks to [@relekang](https://github.com/relekang). (see [#350](https://github.com/styled-components/styled-components/pull/350))
- Converted to DangerJS, thanks to [@orta](https://github.com/orta). (see [#169](https://github.com/styled-components/styled-components/pull/169))

## [v1.2.1]

### Changed

- Fixed flowtype errors and added flow check to CI, thanks to [@relekang](https://github.com/relekang). (see [#319](https://github.com/styled-components/styled-components/pull/319))

## [v1.2.0]

### Added

- Added [`withTheme`](docs/api.md#withtheme) higher order component; thanks [@brunolemos](https://twitter.com/brunolemos). (see [#312](https://github.com/styled-components/styled-components/pull/312))
- Added support for media queries, pseudo selectors and nesting in styles-as-objects. (see [#280](https://github.com/styled-components/styled-components/pull/280))

### Changed

- Do not pass innerRef to the component, thanks [@mkhazov](https://github.com/mkhazov). (see [#310](https://github.com/styled-components/styled-components/pull/310))
- Fixed prop changes not updating style on react native; thanks [@brunolemos](https://twitter.com/brunolemos). (see [#311](https://github.com/styled-components/styled-components/pull/311))
- Extract DOM shorthands, thanks [@philpl](https://github.com/philpl). (see [#172](https://github.com/styled-components/styled-components/pull/172))

## [v1.1.3]

### Changed

- Fixed theme changes in `ThemeProvider`s not re-rendering correctly, thanks [@k15a](https://github.com/k15a). (see [#264](https://github.com/styled-components/styled-components/pull/264))
- Fixed overriding theme through props, thanks [@k15a](https://github.com/k15a). (see [#295](https://github.com/styled-components/styled-components/pull/295))
- Removed `lodash` dependency in favor of small utility packages to knock down bundle size by ~0.5kB

## [v1.1.2]

### Added

- Add `// @flow` to files missing them and fix ThemeProvider types, thanks to [@relekang](https://github.com/relekang). (see [#225](https://github.com/styled-components/styled-components/pull/225))

### Changed

- Fixed setting the default theme via `defaultProps` and theme changes not re-rendering components with new styles, thanks to [@michalkvasnicak](https://github.com/michalkvasnicak). (see [#253](https://github.com/styled-components/styled-components/pull/253))
- Improve ReactNative style generation performance, thanks to [@sheepsteak](https://github.com/sheepsteak). (see [#171](https://github.com/styled-components/styled-components/pull/171))

## [v1.1.1]

### Changed

- Bumped `css-to-react-native` to `v1.0.3` to avoid floating points number bug.

## [v1.1.0]

### Added

- Expose API for Server Side rendering: `styleSheet.reset()` and `styleSheet.getCSS()`, thanks to [@thisguychris](https://github.com/thisguychris), (see [#214](https://github.com/styled-components/styled-components/pull/214)) fixes [#124](https://github.com/styled-components/styled-components/issues/124)
- Added support for deeply nested styles in ReactNative (e.g. `transform`), thanks [@jacobp100](https://github.com/jacobp100). (see [#139](https://github.com/styled-components/styled-components/pull/139))
- Added support for camelized style properties in ReactNative (e.g. `fontWeight`), thanks [@jacobp100](https://github.com/jacobp100). (see [#145](https://github.com/styled-components/styled-components/pull/145))
- Properly expose `flow` typings by adding a `flow:build` step and `flow` support docs, thanks to [@ryyppy](https://github.com/ryyppy). (see [#219](https://github.com/styled-components/styled-components/pull/219))

### Changed

- Converted Object.assign to spread operator, thanks to [@thisguychris](https://github.com/thisguychris). (see [#201](https://github.com/styled-components/styled-components/pull/201))
- Switched to using [inline-style-prefixer](https://github.com/rofrischmann/inline-style-prefixer) for our autoprefixing needs.
- Fixed IE10 compatibility, thanks to [@thisguychris](https://github.com/thisguychris). (see [#217](https://github.com/styled-components/styled-components/pull/217))

## [v1.0.11] - 2016-11-14

### Added

- Pass props to interpolated functions in React Native, thanks to [@haikyuu](https://github.com/haikyuu). (see [#190](https://github.com/styled-components/styled-components/pull/190))

### Changed

- Test coverage for `injectGlobal`, thanks to [@b_hough](https://github.com/bhough). (see [#36](https://github.com/styled-components/styled-components/issues/36))
- Added stricter flow type annotations, thanks to [@relekang](https://github.com/relekang) and [@ryyppy](https://github.com/ryyppy). (see [#148](https://github.com/styled-components/styled-components/pull/148))

## [v1.0.10] - 2016-10-28

### Changed

- Huge performance improvement by injecting styles outside of `render`, thanks to [@JamieDixon](https://github.com/JamieDixon). (see [#137](https://github.com/styled-components/styled-components/pull/137))

## [v1.0.9] - 2016-10-26

### Added

- Added ability to get ref to the inner (DOM) node of the styled component via `innerRef` prop, thanks to [@freiksenet](https://github.com/freiksenet). (see [#122](https://github.com/styled-components/styled-components/pull/122))
- Section in docs about the new `stylelint` support with [`stylelint-processor-styled-components`](https://github.com/styled-components/stylelint-processor-styled-components)

### Changed

- Fixed `theme` prop in `styledComponent` and `styledNativeComponent` so that it will properly inherit values for `theme` when `defaultProps` are set, thanks to [@bhough](https://github.com/bhough). (see [#136](https://github.com/styled-components/styled-components/pull/136))

## [v1.0.8] - 2016-10-18

### Added

- IE10 support, thanks to [@didierfranc](https://github.com/didierfranc)! (see [#119](https://github.com/styled-components/styled-components/pull/119))

### Changed

- Fixed `<ThemeProvider>` component hot reloading

## [v1.0.7] – 2016-10-18

### Added

- Documentation about integrating with an existing CSS codebase
- Support for CSS custom variables

### Changed

- Move react from dependencies to `peer–` & `devDependencies`, thanks to [@sheepsteak](https://github.com/sheepsteak)! (see [#93](https://github.com/styled-components/styled-components/pull/93))
- Fix cyclical dependency deadlock in `.es.js` bundle that forced us to revert v1.0.6, thanks to [@Rich-Harris](https://github.com/Rich-Harris)! (see [#100](https://github.com/styled-components/styled-components/pull/100))
- Refactored and added to e2e test suite

## [v1.0.6] - 2016-10-16 REVERTED

### Added

- `CHANGELOG.md` for tracking changes between versions
- Support for Internet Explorer by removing `Symbol` from the transpiled output
- `.es.js` bundle for Webpack v2 or Rollup users to take advantage of tree shaking, thanks to [@Rich-Harris](https://github.com/Rich-Harris)! (see [#96](https://github.com/styled-components/styled-components/pull/96))

### Changed

- Fixed inheritance of statics (like `defaultProps`) with `styled(StyledComponent)`, thanks to [@diegohaz](https://github.com/diegohaz)! (see [#90](https://github.com/styled-components/styled-components/pull/90))
- UMD bundle is now built with Rollup, which means a 22% reduction in size and a 60% reducing in parse time, thanks to [@Rich-Harris](https://github.com/Rich-Harris)! (see [#96](https://github.com/styled-components/styled-components/pull/96))

## [v1.0.5] - 2016-10-15

### Changed

- Fixed theming on ReactNative

## [v1.0.4] - 2016-10-15

### Changed

- Fixed compatibility with other react-broadcast-based systems (like `react-router` v4)

[unreleased]: https://github.com/styled-components/styled-components/compare/v5.1.0...master
[v5.1.1]: https://github.com/styled-components/styled-components/compare/v5.1.0...v5.1.1
[v5.1.0]: https://github.com/styled-components/styled-components/compare/v5.0.1...v5.1.0
[v5.0.1]: https://github.com/styled-components/styled-components/compare/v5.0.0...v5.0.1
[v5.0.0]: https://github.com/styled-components/styled-components/compare/v4.4.1...v5.0.0
[v4.4.1]: https://github.com/styled-components/styled-components/compare/v4.4.0...v4.4.1
[v4.4.0]: https://github.com/styled-components/styled-components/compare/v4.3.2...v4.4.0
[v4.3.2]: https://github.com/styled-components/styled-components/compare/v4.3.1...v4.3.2
[v4.3.1]: https://github.com/styled-components/styled-components/compare/v4.3.0...v4.3.1
[v4.3.0]: https://github.com/styled-components/styled-components/compare/v4.2.1...v4.3.0
[v4.2.1]: https://github.com/styled-components/styled-components/compare/v4.2.0...v4.2.1
[v4.2.0]: https://github.com/styled-components/styled-components/compare/v4.1.3...v4.2.0
[v4.1.3]: https://github.com/styled-components/styled-components/compare/v4.1.2...v4.1.3
[v4.1.2]: https://github.com/styled-components/styled-components/compare/v4.1.1...v4.1.2
[v4.1.1]: https://github.com/styled-components/styled-components/compare/v4.1.0...v4.1.1
[v4.1.0]: https://github.com/styled-components/styled-components/compare/v4.0.3...v4.1.0
[v4.0.3]: https://github.com/styled-components/styled-components/compare/v4.0.2...v4.0.3
[v4.0.2]: https://github.com/styled-components/styled-components/compare/v4.0.1...v4.0.2
[v4.0.1]: https://github.com/styled-components/styled-components/compare/v4.0.0...v4.0.1
[v4.0.0]: https://github.com/styled-components/styled-components/compare/v4.0.0-beta.11...v4.0.0
[v4.0.0-beta.11]: https://github.com/styled-components/styled-components/compare/v4.0.0-beta.10...v4.0.0-beta.11
[v4.0.0-beta.10]: https://github.com/styled-components/styled-components/compare/v4.0.0-beta.9...v4.0.0-beta.10
[v4.0.0-beta.9]: https://github.com/styled-components/styled-components/compare/v4.0.0-beta.8...v4.0.0-beta.9
[v4.0.0-beta.8]: https://github.com/styled-components/styled-components/compare/v4.0.0-beta.7...v4.0.0-beta.8
[v4.0.0-beta.7]: https://github.com/styled-components/styled-components/compare/v4.0.0-beta.6...v4.0.0-beta.7
[v4.0.0-beta.6]: https://github.com/styled-components/styled-components/compare/v4.0.0-beta.5...v4.0.0-beta.6
[v4.0.0-beta.5]: https://github.com/styled-components/styled-components/compare/v4.0.0-beta.4...v4.0.0-beta.5
[v4.0.0-beta.4]: https://github.com/styled-components/styled-components/compare/v4.0.0-beta.3...v4.0.0-beta.4
[v4.0.0-beta.3]: https://github.com/styled-components/styled-components/compare/v4.0.0-beta.2...v4.0.0-beta.3
[v4.0.0-beta.2]: https://github.com/styled-components/styled-components/compare/v4.0.0-beta.1...v4.0.0-beta.2
[v4.0.0-beta.1]: https://github.com/styled-components/styled-components/compare/v4.0.0-beta.0...v4.0.0-beta.1
[v4.0.0-beta.0]: https://github.com/styled-components/styled-components/compare/v3.4.10...v4.0.0-beta.0
[v3.4.10]: https://github.com/styled-components/styled-components/compare/v3.4.9...v3.4.10
[v3.4.9]: https://github.com/styled-components/styled-components/compare/v3.4.8...v3.4.9
[v3.4.8]: https://github.com/styled-components/styled-components/compare/v3.4.7...v3.4.8
[v3.4.7]: https://github.com/styled-components/styled-components/compare/v3.4.6...v3.4.7
[v3.4.6]: https://github.com/styled-components/styled-components/compare/v3.4.5...v3.4.6
[v3.4.5]: https://github.com/styled-components/styled-components/compare/v3.4.4...v3.4.5
[v3.4.4]: https://github.com/styled-components/styled-components/compare/v3.4.3...v3.4.4
[v3.4.3]: https://github.com/styled-components/styled-components/compare/v3.4.2...v3.4.3
[v3.4.2]: https://github.com/styled-components/styled-components/compare/v3.4.1...v3.4.2
[v3.4.1]: https://github.com/styled-components/styled-components/compare/v3.4.0...v3.4.1
[v3.4.0]: https://github.com/styled-components/styled-components/compare/v3.3.3...v3.4.0
[v3.3.3]: https://github.com/styled-components/styled-components/compare/v3.3.2...v3.3.3
[v3.3.2]: https://github.com/styled-components/styled-components/compare/v3.3.0...v3.3.2
[v3.3.0]: https://github.com/styled-components/styled-components/compare/v3.2.6...v3.3.0
[v3.2.6]: https://github.com/styled-components/styled-components/compare/v3.2.5...v3.2.6
[v3.2.5]: https://github.com/styled-components/styled-components/compare/v3.2.3...v3.2.5
[v3.2.3]: https://github.com/styled-components/styled-components/compare/v3.2.2...v3.2.3
[v3.2.2]: https://github.com/styled-components/styled-components/compare/v3.2.1...v3.2.2
[v3.2.1]: https://github.com/styled-components/styled-components/compare/v3.2.0...v3.2.1
[v3.2.0]: https://github.com/styled-components/styled-components/compare/v3.1.6...v3.2.0
[v3.1.6]: https://github.com/styled-components/styled-components/compare/v3.1.5...v3.1.6
[v3.1.5]: https://github.com/styled-components/styled-components/compare/v3.1.4...v3.1.5
[v3.1.4]: https://github.com/styled-components/styled-components/compare/v3.1.3...v3.1.4
[v3.1.3]: https://github.com/styled-components/styled-components/compare/v3.1.1...v3.1.3
[v3.1.1]: https://github.com/styled-components/styled-components/compare/v3.1.0...v3.1.1
[v3.1.0]: https://github.com/styled-components/styled-components/compare/v3.0.2...v3.1.0
[v3.0.2]: https://github.com/styled-components/styled-components/compare/v3.0.1...v3.0.2
[v3.0.1]: https://github.com/styled-components/styled-components/compare/v2.4.0...v3.0.1
[v2.4.0]: https://github.com/styled-components/styled-components/compare/v2.3.3...v2.4.0
[v2.3.3]: https://github.com/styled-components/styled-components/compare/v2.3.2...v2.3.3
[v2.3.2]: https://github.com/styled-components/styled-components/compare/v2.3.1...v2.3.2
[v2.3.1]: https://github.com/styled-components/styled-components/compare/v2.3.0...v2.3.1
[v2.3.0]: https://github.com/styled-components/styled-components/compare/v2.2.4...v2.3.0
[v2.2.4]: https://github.com/styled-components/styled-components/compare/v2.2.3...v2.2.4
[v2.2.3]: https://github.com/styled-components/styled-components/compare/v2.2.2...v2.2.3
[v2.2.2]: https://github.com/styled-components/styled-components/compare/v2.2.1...v2.2.2
[v2.2.1]: https://github.com/styled-components/styled-components/compare/v2.2.0...v2.2.1
[v2.2.0]: https://github.com/styled-components/styled-components/compare/v2.1.1...v2.2.0
[v2.1.2]: https://github.com/styled-components/styled-components/compare/v2.1.1...v2.1.2
[v2.1.1]: https://github.com/styled-components/styled-components/compare/v2.1.0...v2.1.1
[v2.1.0]: https://github.com/styled-components/styled-components/compare/v2.0.1...v2.1.0
[v2.0.1]: https://github.com/styled-components/styled-components/compare/v2.0.0...v2.0.1
[v2.0.0]: https://github.com/styled-components/styled-components/compare/v1.4.6...v2.0.0
[v1.4.6]: https://github.com/styled-components/styled-components/compare/v1.4.5...v1.4.6
[v1.4.5]: https://github.com/styled-components/styled-components/compare/v1.4.4...v1.4.5
[v1.4.4]: https://github.com/styled-components/styled-components/compare/v1.4.3...v1.4.4
[v1.4.3]: https://github.com/styled-components/styled-components/compare/v1.4.2...v1.4.3
[v1.4.2]: https://github.com/styled-components/styled-components/compare/v1.4.1...v1.4.2
[v1.4.1]: https://github.com/styled-components/styled-components/compare/v1.4.0...v1.4.1
[v1.4.0]: https://github.com/styled-components/styled-components/compare/v1.3.1...v1.4.0
[v1.3.1]: https://github.com/styled-components/styled-components/compare/v1.3.0...v1.3.1
[v1.3.0]: https://github.com/styled-components/styled-components/compare/v1.2.1...v1.3.0
[v1.2.1]: https://github.com/styled-components/styled-components/compare/v1.2.0...v1.2.1
[v1.2.0]: https://github.com/styled-components/styled-components/compare/v1.1.3...v1.2.0
[v1.1.3]: https://github.com/styled-components/styled-components/compare/v1.1.2...v1.1.3
[v1.1.2]: https://github.com/styled-components/styled-components/compare/v1.1.1...v1.1.2
[v1.1.1]: https://github.com/styled-components/styled-components/compare/v1.1.0...v1.1.1
[v1.1.0]: https://github.com/styled-components/styled-components/compare/v1.0.11...v1.1.0
[v1.0.11]: https://github.com/styled-components/styled-components/compare/v1.0.10...v1.0.11
[v1.0.10]: https://github.com/styled-components/styled-components/compare/v1.0.9...v1.0.10
[v1.0.9]: https://github.com/styled-components/styled-components/compare/v1.0.8...v1.0.9
[v1.0.8]: https://github.com/styled-components/styled-components/compare/v1.0.7...v1.0.8
[v1.0.7]: https://github.com/styled-components/styled-components/compare/v1.0.6...v1.0.7
[v1.0.6]: https://github.com/styled-components/styled-components/compare/v1.0.5...v1.0.6
[v1.0.5]: https://github.com/styled-components/styled-components/compare/v1.0.4...v1.0.5
[v1.0.4]: https://github.com/styled-components/styled-components/compare/v1.0.3...v1.0.4
