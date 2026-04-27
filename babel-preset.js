const { BABEL_ENV, NODE_ENV } = process.env;
const modules = BABEL_ENV === 'cjs' || NODE_ENV === 'test' ? 'commonjs' : false;

const isReactNativeFile = filepath =>
  /[\\/]node_modules[\\/](?:react-native|@react-native(?:-community)?)[\\/]/.test(filepath);

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
    '@babel/preset-typescript',
  ],
  plugins: [
    '@babel/plugin-transform-flow-strip-types',
    ['@babel/plugin-proposal-object-rest-spread', { loose: true }],
    ['@babel/plugin-proposal-class-properties', { loose: true }],
  ].filter(Boolean),
  overrides: [
    // Our own build uses `add-module-exports` so CJS consumers get the default
    // export at `require(...)` directly. RN's source assumes native ESM->CJS
    // semantics (`.default` access) — applying `add-module-exports` there
    // collapses `module.exports = exports.default` and breaks `require('.../PixelRatio').default`.
    // Gate it to SC's own sources only.
    modules === 'commonjs' && {
      test: filepath => !isReactNativeFile(filepath),
      plugins: ['add-module-exports'],
    },
    // RN 0.79 ships source as a mix of Flow, TypeScript, and JSX. Route its
    // files to @react-native/babel-preset — the canonical parser for RN source.
    {
      test: filepath => isReactNativeFile(filepath),
      presets: [['@react-native/babel-preset', { disableImportExportTransform: false }]],
    },
  ].filter(Boolean),
});
