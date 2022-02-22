// eslint-disable-next-line
const baseConfig = require('./jest.config.base');

module.exports = Object.assign({}, baseConfig, {
  roots: ['<rootDir>/src/'],
  setupFiles: ['<rootDir>/src/test/globals.ts'],
  setupFilesAfterEnv: ['<rootDir>/test-utils/setupTestFramework.ts'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['<rootDir>/src/native', '<rootDir>/src/primitives'],
});
