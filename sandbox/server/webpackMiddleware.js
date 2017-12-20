const path = require('path')

const webpack = require('webpack')
const webpackConfig = require('./webpack.config')

const { composeMiddleware, SANDBOX_PATHS } = require('../util')

const compiler = webpack(webpackConfig)

const devMiddleware = require('webpack-dev-middleware')(compiler, {
  publicPath: SANDBOX_PATHS.publicPath,
})

const hotMiddleware = require('webpack-hot-middleware')(compiler)

compiler.plugin('after-emit', (compilation, callback) => {
  Object.keys(require.cache).forEach(cachedFile => {
    if (cachedFile.startsWith(path.resolve(SANDBOX_PATHS.outputPath))) {
      delete require.cache[cachedFile]
    }
  })

  callback()
})

module.exports = next => composeMiddleware(devMiddleware, hotMiddleware)(next)
