const baseConfig = require('./config.base');

module.exports = Object.assign({}, baseConfig, {
  testRegex: 'src/primitives/test/.*.js$',
  moduleFileExtensions: ['ios.js', 'js'],
  preset: 'react-native',
  testURL: 'http://localhost',
  testEnvironment: 'jsdom',
});
