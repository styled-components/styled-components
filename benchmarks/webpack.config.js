// @flow
const webpack = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const path = require('path');

const appDirectory = path.resolve(__dirname);

module.exports = {
  mode: 'production',
  devtool: 'source-map',
  context: __dirname,
  entry: './src/index',
  output: {
    path: path.resolve(appDirectory, 'dist'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: { modules: true, localIdentName: '[hash:base64:8]' },
          },
        ],
      },
      {
        test: /\.js$/,
        include: [path.resolve(appDirectory, 'src'), path.resolve('..', 'src')],
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
    }),

    new webpack.DefinePlugin({
      __VERSION__: JSON.stringify('benchmark'),
    }),
  ],
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      'styled-components': path.resolve('../src'),
    },
  },
};
