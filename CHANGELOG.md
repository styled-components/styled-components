# Change Log

All notable changes to this project will be documented in this file. If a contribution does not have a mention next to it, [@geelen](https://github.com/geelen) or [@mxstbr](https://github.com/mxstbr) did it.

*The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).*

## [Unreleased]

### Added

- `CHANGELOG.md` for tracking changes between versions
- Support for Internet Explorer by removing `Symbol` from the transpiled output

### Changed

- Fixed inheritance of statics (like `defaultProps`) with `styled(StyledComponent)`, thanks to [@diegohaz](https://github.com/diegohaz)! (see [#90](https://github.com/styled-components/styled-components/pull/90))

## [v1.0.5] - 2016-10-15

### Changed

- Fixed theming on ReactNative

## [v1.0.4] - 2016-10-15

### Changed

- Fixed compatibility with other react-broadcast-based systems (like `react-router` v4)

[Unreleased]: https://github.com/styled-components/styled-components/compare/v1.0.5...master
[v1.0.5]: https://github.com/styled-components/styled-components/compare/v1.0.4...v1.0.5
[v1.0.4]: https://github.com/styled-components/styled-components/compare/v1.0.3...v1.0.4
