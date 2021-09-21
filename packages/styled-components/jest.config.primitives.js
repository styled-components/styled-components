// eslint-disable-next-line
const nativeConfig = require('./jest.config.native');

module.exports = Object.assign({}, nativeConfig, {
  moduleFileExtensions: ['ios.js', 'ios.ts', 'ios.tsx', 'js', 'ts', 'tsx'],
  testRegex: 'src/primitives/test/.*.tsx?$',
});
