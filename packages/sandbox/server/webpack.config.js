const path = require('path');
const webpack = require('webpack');
const WriteFilePlugin = require('write-file-webpack-plugin');

const { SANDBOX_PATHS } = require('../util');

const {
  cwd,
  outputPath,
  publicPath,
  appSrc,
  serverApp,
  clientApp,
  styledComponentsSrc,
} = SANDBOX_PATHS;

const createOutput = () => ({
  path: outputPath,
  filename: '[name].js',
  publicPath,
  strictModuleExceptionHandling: true,
});

const ifNotExample = filename => /\.js$/.test(filename) && !/\.example\.js/.test(filename);

const ifExample = filename => /\.example\.js/.test(filename);

const createRules = () => [
  // Indentation eslint errors are preventing hmr to work properly :'(
  // {
  //   test: ifNotExample,
  //   include: [styledComponentsSrc],
  //   enforce: 'pre',
  //   use: [
  //     {
  //       loader: 'eslint-loader',
  //       options: {
  //         ignore: true,
  //       },
  //     },
  //   ],
  // },
  {
    test: ifExample,
    include: [appSrc],
    use: [{ loader: 'raw-loader' }],
  },
  {
    test: ifNotExample,
    include: [appSrc, styledComponentsSrc],
    use: [{ loader: 'babel-loader', options: { configFile: path.join(__dirname, '../.babelrc') } }],
  },
];

const createPlugins = () => [
  new webpack.EnvironmentPlugin({
    // This will provide default value for NODE_ENV, unless defined otherwise
    // more info: https://webpack.js.org/plugins/environment-plugin/#usage-with-default-values
    NODE_ENV: 'development',
  }),
  new webpack.DefinePlugin({
    // eslint-disable-next-line global-require
    __VERSION__: JSON.stringify(require('../../styled-components/package.json').version),
  }),
];

const createAlias = () => ({
  'styled-components': styledComponentsSrc,
});

module.exports = [
  {
    context: cwd,

    name: 'client',

    mode: 'development',

    devtool: 'cheap-module-eval-source-map',

    entry: {
      client: [
        'webpack-hot-middleware/client?timeout=20000&overlay=false&reload=false&name=client',
        clientApp,
      ],
    },

    output: createOutput(),

    module: { rules: createRules() },

    plugins: createPlugins().concat([new webpack.HotModuleReplacementPlugin()]),

    resolve: { alias: createAlias() },
  },
  {
    context: cwd,

    name: 'server',

    mode: 'development',

    entry: {
      server: [serverApp],
    },

    output: { ...createOutput(), libraryTarget: 'commonjs2' },

    module: { rules: createRules() },

    plugins: createPlugins().concat([
      new WriteFilePlugin({
        test: /\.js$/,
        exitOnErrors: false,
        useHashIndex: false,
      }),
    ]),

    resolve: { alias: createAlias() },
  },
];
