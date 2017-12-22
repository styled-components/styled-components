# Changelog

All notable changes to this project will be documented in this file. If a contribution does not have a mention next to it, [@geelen](https://github.com/geelen) or [@mxstbr](https://github.com/mxstbr) did it.

*The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).*

## Unreleased

-

## [v2.4.0] - 2017-12-22

- remove some extra information from the generated hash that can differ between build environments ([see #1381](https://github.com/styled-components/styled-components/pull/1381))

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
- Prevent component styles from being static if `attrs` are dynmaic (see [#1219](https://github.com/styled-components/styled-components/pull/1219))
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
- Removed dependency on `glamor` and migrated remaining references to the internval vendored `glamor` module. (see [#663](https://github.com/styled-components/styled-components/pull/663))
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
- Removed custom flowtype supressor in favour of default `$FlowFixMe` [@relekang](https://github.com/relekang). (see [#335](https://github.com/styled-components/styled-components/pull/335))
- Updated all dependencies to latest semver, thanks to [@amilajack](https://github.com/amilajack). (see [#324](https://github.com/styled-components/styled-components/pull/324))
- Updated all demos to link to latest version, thanks to [@relekang](https://github.com/relekang). (see [#350](https://github.com/styled-components/styled-components/pull/350))
- Converted to DangerJS, thanks to [@orta](https://github.com/orta). (see [#169](https://github.com/styled-components/styled-components/pull/169))

## [v1.2.1]

### Changed

- Fixed flowtype errors and added flow check to CI, thanks to [@relekang](https://github.com/relekang). (see [#319](https://github.com/styled-components/styled-components/pull/319))

## [v1.2.0]

### Added

- Added [`withTheme`](docs/api.md#withtheme) higher order component; thanks [@brunolemos](https://twitter.com/brunolemos). (see [#312] (https://github.com/styled-components/styled-components/pull/312))
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

[Unreleased]: https://github.com/styled-components/styled-components/compare/v2.3.1...master
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
