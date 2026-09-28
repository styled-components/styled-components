module.exports = {
  clearMocks: true,
  collectCoverage: !!process.env.PULL_REQUEST,
  fakeTimers: {
    legacyFakeTimers: true,
  },
  /**
   * Biome formats this repo. Without this, Jest writes inline snapshots
   * through a transitively installed Prettier, which reformats the whole test
   * file, including the CSS inside styled templates.
   */
  prettierPath: null,
  rootDir: '.',
  snapshotSerializers: ['jest-serializer-html'],
  testEnvironmentOptions: {
    url: 'http://localhost',
  },
  testPathIgnorePatterns: ['node_modules', 'dist', '.rollup.cache'],
  watchPlugins: ['jest-watch-typeahead/filename', 'jest-watch-typeahead/testname'],
};
