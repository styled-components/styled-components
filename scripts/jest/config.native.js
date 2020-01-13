const baseConfig = require('./config.base');

module.exports = Object.assign({}, baseConfig, {
  preset: 'react-native',
  setupFiles: ['<rootDir>/packages/styled-components/src/test/globals.js'],
  testEnvironment: 'node',
  testRegex: 'src/native/test/.*.js$',
  transform: {
    '^.+\\.js$': '<rootDir>/node_modules/react-native/jest/preprocessor.js',
  },
});
