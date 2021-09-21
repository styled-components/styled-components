// eslint-disable-next-line
const baseConfig = require('./jest.config.base');

module.exports = Object.assign({}, baseConfig, {
  testRegex: './integration-test/.*.js$',
});
