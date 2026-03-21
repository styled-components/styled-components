const baseConfig = require('./jest.config.base');

module.exports = Object.assign({}, baseConfig, {
  roots: ['<rootDir>/src/test/'],
  testMatch: ['**/treeshake.test.ts'],
  testEnvironment: 'node',
});
