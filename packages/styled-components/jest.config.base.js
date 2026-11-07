module.exports = {
  clearMocks: true,
  collectCoverage: !!process.env.PULL_REQUEST,
  fakeTimers: {
    legacyFakeTimers: true,
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
