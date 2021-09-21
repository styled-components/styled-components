module.exports = {
  clearMocks: true,
  collectCoverage: !!process.env.PULL_REQUEST,
  rootDir: '.',
  snapshotSerializers: ['jest-serializer-html'],
  testURL: 'http://localhost',
  testPathIgnorePatterns: ['node_modules', 'dist'],
};
