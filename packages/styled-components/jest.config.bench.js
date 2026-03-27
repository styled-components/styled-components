const baseConfig = require('./jest.config.base');

module.exports = Object.assign({}, baseConfig, {
  roots: ['<rootDir>/src/bench/'],
  setupFiles: ['<rootDir>/src/test/globals.ts', '<rootDir>/src/bench/setup.js'],
  testEnvironment: 'jsdom',
  testTimeout: 120000,
});
