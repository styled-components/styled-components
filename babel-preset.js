const { BABEL_ENV, NODE_ENV } = process.env;
const modules = BABEL_ENV === 'cjs' || NODE_ENV === 'test' ? 'commonjs' : false;

module.exports = () => ({
  presets: [
    [
      '@babel/preset-env',
      {
        targets: NODE_ENV === 'test' ? { node: 'current' } : undefined,
        loose: true,
        modules,
      },
    ],
    '@babel/preset-react',
    '@babel/preset-flow',
  ],
  plugins: [
    ['babel-plugin-transform-react-remove-prop-types', { mode: 'unsafe-wrap' }],
    ['@babel/plugin-proposal-object-rest-spread', { loose: true }],
    ['@babel/plugin-proposal-class-properties', { loose: true }],
    modules === 'commonjs' && 'add-module-exports',
  ].filter(Boolean),
});
