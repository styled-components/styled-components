/* eslint-disable flowtype/require-valid-file-annotation */
const webpack = require('webpack')

const path = require('path')

const rootDir = (...args) => path.join(__dirname, ...args)

module.exports = {
  // Entry files for our sandbox
  entry: {
    // Client livereload code
    livereload: rootDir('livereload', 'client.js'),
    // Client-side code
    browser: rootDir('src', 'browser.js'),
    // Server-side code
    server: rootDir('src', 'server.js'),
  },
  // `cheap-module-source-map` generates sourcemaps with original source
  // more info: https://webpack.js.org/configuration/devtool/
  devtool: 'cheap-module-source-map',
  devServer: {
    compress: true,
    // Static content for webpack-dev-server
    contentBase: rootDir('public'),
    // By default webpack-dev-server doesn't watch static content
    watchContentBase: true,
    publicPath: '/',
    // Allows all 404 routes to redirect to index.html
    historyApiFallback: true,
  },
  output: {
    // This would not be actually saved on disk when used with webpack-dev-server
    // but config prop is required
    path: rootDir('build'),
    filename: '[name].js',
    publicPath: '/',
  },
  resolve: {
    alias: {
      // Allows to use absolute import for styled-components in the sandbox
      'styled-components': rootDir('..', 'src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        include: [rootDir('src'), rootDir('..', 'src')],
        enforce: 'pre',
        use: [
          {
            loader: 'eslint-loader',
            options: {
              ignore: true,
            },
          },
        ],
      },
      {
        test: /\.(js|jsx)$/,
        include: [rootDir('src'), rootDir('..', 'src')],
        loader: 'babel-loader',
      },
    ],
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      // This will provide default value for NODE_ENV, unless defined otherwise
      // more info: https://webpack.js.org/plugins/environment-plugin/#usage-with-default-values
      NODE_ENV: 'development',
    }),
  ],
  performance: {
    // Don't need those in development sandbox
    hints: false,
  },
}
