const { BABEL_ENV, NODE_ENV } = process.env;
const modules = BABEL_ENV === 'cjs' || NODE_ENV === 'test' ? 'commonjs' : false;

const loose = true;

module.exports = api => {
  return {
    presets: [
      [
        '@babel/preset-env',
        {
          loose,
          modules,
          ...(api.env('test') ? { targets: { node: 'current' } } : {}),
        },
      ],
      '@babel/preset-react',
      '@babel/preset-flow',
    ],
    plugins: [
      'preval',
      '@babel/plugin-transform-flow-strip-types',
      ['@babel/plugin-proposal-class-properties', { loose }],
      ['transform-react-remove-prop-types', { mode: 'unsafe-wrap' }],
      modules === 'commonjs' && 'add-module-exports',
    ].filter(Boolean),
  };
};
