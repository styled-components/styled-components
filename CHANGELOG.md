# Change Log

All notable changes to this project will be documented in this file. If a contribution does not have a mention next to it, [@geelen](https://github.com/geelen) or [@mxstbr](https://github.com/mxstbr) did it.

*The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).*

## [Unreleased]

### Added

### Changed

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

[Unreleased]: https://github.com/styled-components/styled-components/compare/v1.1.2...master
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
