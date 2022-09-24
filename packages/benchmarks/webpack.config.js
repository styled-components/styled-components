const webpack = require('webpack');
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
  performance: {
    hints: false,
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
      },
      {
        test: /\.(js|tsx?)$/,
        include: [path.join(appDirectory, 'src')],
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      __VERSION__: JSON.stringify('benchmark'),
    }),
  ],
  resolve: {
    alias: {
      'react-native$': 'react-native-web',
    },
  },
};
