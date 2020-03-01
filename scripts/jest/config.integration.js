const baseConfig = require('./config.base');

module.exports = Object.assign({}, baseConfig, {
  testRegex: './integration-test/.*.js$',
});
