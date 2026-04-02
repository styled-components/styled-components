const baseConfig = require('./jest.config.base');

module.exports = Object.assign({}, baseConfig, {
  roots: ['<rootDir>/src/bench/'],
  setupFiles: ['<rootDir>/src/test/globals.ts', '<rootDir>/src/bench/setup.js'],
  testEnvironment: 'node',
  testMatch: ['**/rsc*.test.[jt]s?(x)'],
  testTimeout: 120000,
});
