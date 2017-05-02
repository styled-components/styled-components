# Changelog

All notable changes to this project will be documented in this file. If a contribution does not have a mention next to it, [@geelen](https://github.com/geelen) or [@mxstbr](https://github.com/mxstbr) did it.

*The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).*

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

[Unreleased]: https://github.com/styled-components/styled-components/compare/v1.4.6...master
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
