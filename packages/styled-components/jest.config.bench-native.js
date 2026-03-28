const baseConfig = require('./jest.config.base');

module.exports = Object.assign({}, baseConfig, {
  preset: 'react-native',
  roots: ['<rootDir>/src/bench/'],
  setupFiles: ['<rootDir>/src/test/globals.ts', '<rootDir>/src/bench/setup.js'],
  testEnvironment: 'node',
  testMatch: ['**/bench/native*.test.*'],
  testTimeout: 120000,
});
