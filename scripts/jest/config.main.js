const path = require('path');
const baseConfig = require('./config.base');

module.exports = Object.assign({}, baseConfig, {
  rootDir: path.join(__dirname, '../../packages/styled-components'),
  roots: ['<rootDir>/src/'],
  setupFiles: ['<rootDir>/src/test/globals.ts'],
  setupFilesAfterEnv: ['<rootDir>/test-utils/setupTestFramework.ts'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['<rootDir>/src/native', '<rootDir>/src/primitives'],
});
