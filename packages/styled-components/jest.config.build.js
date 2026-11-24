const baseConfig = require('./jest.config.base');

module.exports = Object.assign({}, baseConfig, {
  // The dist tests resolve the package's own name through the root workspace link to the built files.
  moduleNameMapper: {},
  roots: ['<rootDir>/src/test/'],
  // The suites also load source helpers (rscStream), which read the build constants.
  setupFiles: ['<rootDir>/src/test/globals.ts'],
  testMatch: ['**/treeshake.test.ts', '**/dist-behavior.test.js'],
  testEnvironment: 'node',
});
