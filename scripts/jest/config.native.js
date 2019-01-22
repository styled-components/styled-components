const baseConfig = require('./config.base');

const copy = Object.assign({}, baseConfig);

// react-native preset brings its own haste implementation
delete copy.haste;

module.exports = Object.assign(copy, {
  testRegex: 'src/native/test/.*.js$',
  preset: 'react-native',
  testURL: 'http://localhost',
  testEnvironment: 'jsdom',
});
