const baseConfig = require('./jest.config.base');

module.exports = Object.assign({}, baseConfig, {
  roots: ['<rootDir>/src/bench/'],
  setupFiles: ['<rootDir>/src/test/globals.ts', '<rootDir>/src/bench/setup.js'],
  testEnvironment: 'jsdom',
  testMatch: [
    '**/web*.test.[jt]s?(x)',
    '**/preprocess*.test.[jt]s?(x)',
    '**/parser*.bench.test.[jt]s?(x)',
    '**/responsive*.bench.test.[jt]s?(x)',
    '**/v6-vs-v7*.bench.test.[jt]s?(x)',
  ],
  testTimeout: 120000,
});
