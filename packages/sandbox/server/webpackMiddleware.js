const path = require('path');

const webpack = require('webpack');
const webpackConfig = require('./webpack.config');

const { composeMiddleware, SANDBOX_PATHS } = require('../util');

const multiCompiler = webpack(webpackConfig);

const devMiddleware = require('webpack-dev-middleware')(multiCompiler, {
  publicPath: SANDBOX_PATHS.publicPath,
  logLevel: 'silent',
});

const hotMiddleware = require('webpack-hot-middleware')(multiCompiler);

const waitUntilValid = new Promise(next => devMiddleware.waitUntilValid(next));

const waitMiddleware = (req, res, next) => waitUntilValid.then(next);

multiCompiler.compilers.forEach(compiler => {
  compiler.hooks.afterEmit.tapAsync(
    {
      name: 'ClearSandboxCache',
    },
    (compilation, callback) => {
      Object.keys(require.cache).forEach(cachedFile => {
        if (cachedFile.startsWith(path.resolve(SANDBOX_PATHS.outputPath))) {
          delete require.cache[cachedFile];
        }
      });

      callback();
    }
  );
});

module.exports = next => composeMiddleware(waitMiddleware, devMiddleware, hotMiddleware)(next);
