const webpack = require('webpack')
const path = require('path')

module.exports = [{
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'styled-components.js',
    library: 'styled',
    libraryTarget: 'umd',
  },
  externals: {
    react: 'React',
  },
  module: {
    loaders: [
      {
        loader: 'babel',
        test: /\.js$/,
        exclude: /node_modules/,
      },
      {
        loader: 'json',
        test: /\.json$/,
      },
    ],
  },
}, {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'styled-components.min.js',
    library: 'styled',
    libraryTarget: 'umd',
  },
  externals: {
    react: 'React',
  },
  module: {
    loaders: [
      {
        loader: 'babel',
        test: /\.js$/,
        exclude: /node_modules/,
      },
      {
        loader: 'json',
        test: /\.json$/,
      },
    ],
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false,
      },
    }),
  ],
}]
