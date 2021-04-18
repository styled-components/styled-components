const path = require('path');
const baseConfig = require('./config.base');

module.exports = Object.assign({}, baseConfig, {
  rootDir: path.join(__dirname, '../../packages/styled-components'),
  roots: ['<rootDir>/src/'],
  setupFiles: ['raf/polyfill', '<rootDir>/src/test/globals.ts'],
  setupFilesAfterEnv: ['<rootDir>/test-utils/setupTestFramework.ts'],
  testPathIgnorePatterns: ['<rootDir>/src/native', '<rootDir>/src/primitives'],
});
