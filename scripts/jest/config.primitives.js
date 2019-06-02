const nativeConfig = require('./config.native');

module.exports = Object.assign({}, nativeConfig, {
  moduleFileExtensions: ['ios.js', 'js'],
  testRegex: 'src/primitives/test/.*.js$',
});
