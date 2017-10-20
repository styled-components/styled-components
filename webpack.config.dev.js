/* eslint-disable flowtype/require-valid-file-annotation */
const webpack = require('webpack')

const path = require('path')

const cwd = (...args) => path.join(process.cwd(), ...args)

module.exports = {
  // entry file for out sandbox
  entry: cwd('sandbox', 'index.js'),
  // cheap-module-source-map generates sourcemaps with original source
  // more info: https://webpack.js.org/configuration/devtool/
  devtool: 'cheap-module-source-map',
  devServer: {
    compress: true,
    // static content for webpack-dev-server
    contentBase: cwd('sandbox', 'public'),
    // by default webpack-dev-server doesn't watch static content
    watchContentBase: true,
    publicPath: '/',
    // allows all 404 routes to redirect to index.html
    historyApiFallback: true,
  },
  // provide React, ReactDOM as external dependency
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM',
  },
  output: {
    // this would not be actually be saved on disk when used with webpack-dev-server
    path: cwd('build'),
    filename: 'bundle.js',
    publicPath: '/',
  },
  resolve: {
    alias: {
      // allows to use absolute import for styled-components in the sandbox
      'styled-components': cwd('src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        include: [cwd('sandbox'), cwd('src')],
        loader: 'babel-loader',
      },
    ],
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      // this will provide default value for NODE_ENV, unless defined otherwise
      // more info: https://webpack.js.org/plugins/environment-plugin/#usage-with-default-values
      NODE_ENV: 'development',
    }),
  ],
  performance: {
    // don't need those in development sandbox
    hints: false,
  },
}
