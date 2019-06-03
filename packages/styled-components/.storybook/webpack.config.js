const webpack = require('webpack');

module.exports = async ({ config }) => {
  config.plugins.push(
    new webpack.DefinePlugin({
      // eslint-disable-next-line global-require
      __VERSION__: JSON.stringify(require('..//package.json').version),
    })
  );

  return config;
};
