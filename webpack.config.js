const webpack = require('webpack')

const plugins = [
  new webpack.DefinePlugin({
    'process.env.NODE_ENV': 'production',
  }),
]

if (process.env.MINIFY_JS) {
  plugins.push(new webpack.optimize.UglifyJsPlugin({
    compress: {
      warnings: false,
    },
  }))
}

module.exports = {
  output: {
    library: 'styled-components',
    libraryTarget: 'umd',
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
  plugins: plugins, // eslint-disable-line object-shorthand
}
