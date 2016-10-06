const webpack = require('webpack')
const path = require('path')

module.exports = [{
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'styled-components.js',
    library: 'styled-components',
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
  plugins: [new webpack.DefinePlugin({ 'process.env.NODE_ENV': 'production' })],
}, {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'styled-components.min.js',
    library: 'styled-components',
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
    new webpack.DefinePlugin({ 'process.env.NODE_ENV': 'production' }),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false,
      },
    }),
  ],
}]
