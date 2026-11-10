module.exports = {
  clearMocks: true,
  collectCoverage: !!process.env.PULL_REQUEST,
  fakeTimers: {
    legacyFakeTimers: true,
  },
  // The package's own subpaths resolve to source; the dist tests clear this (jest.config.build.js).
  // The server-styles subpath maps to its module rather than the shim, which re-exports from the
  // package index: loading the whole library there would run before a suite's own mocks register.
  moduleNameMapper: {
    '^styled-components$': '<rootDir>/src/index.ts',
    '^styled-components/server-styles$': '<rootDir>/src/models/ScStyle.ts',
  },
  /** Null skips prettier when writing inline snapshots; the repo formats with Biome. */
  prettierPath: null,
  restoreMocks: true,
  rootDir: '.',
  snapshotSerializers: ['jest-serializer-html'],
  testEnvironmentOptions: {
    url: 'http://localhost',
  },
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/dist/', '/\\.rollup\\.cache/'],
  watchPlugins: ['jest-watch-typeahead/filename', 'jest-watch-typeahead/testname'],
};
