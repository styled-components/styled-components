module.exports = {
  clearMocks: true,
  collectCoverage: !!process.env.PULL_REQUEST,
  fakeTimers: {
    legacyFakeTimers: true,
  },
  rootDir: '.',
  snapshotSerializers: ['jest-serializer-html'],
  testEnvironmentOptions: {
    url: 'http://localhost',
  },
  testPathIgnorePatterns: ['node_modules', 'dist', '.rollup.cache'],
  watchPlugins: ['jest-watch-typeahead/filename', 'jest-watch-typeahead/testname'],
};
