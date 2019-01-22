const baseConfig = require('./config.base');

module.exports = Object.assign({}, baseConfig, {
  testURL: 'http://localhost',
  clearMocks: true,
  roots: ['<rootDir>/src/', '<rootDir>/../styled-sheet/'],
  setupFiles: ['raf/polyfill', '<rootDir>/src/test/globals.js'],
  setupTestFrameworkScriptFile: '<rootDir>/test-utils/setupTestFramework.js',
  testPathIgnorePatterns: ['<rootDir>/src/native', '<rootDir>/src/primitives'],
});
