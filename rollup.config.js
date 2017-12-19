/* eslint-disable flowtype/require-valid-file-annotation, no-console, import/extensions */
import nodeResolve from 'rollup-plugin-node-resolve'
import replace from 'rollup-plugin-replace'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'
import json from 'rollup-plugin-json'
import flow from 'rollup-plugin-flow'
import uglify from 'rollup-plugin-uglify'
import visualizer from 'rollup-plugin-visualizer'
import pkg from './package.json'

const cjs = {
  format: 'cjs',
  outro: "module.exports = exports['default']",
  exports: 'named',
}

const commonPlugins = [
  flow(),
  json(),
  nodeResolve(),
  commonjs({
    ignoreGlobal: true,
  }),
  babel({
    plugins: ['external-helpers'],
  }),
]

const configBase = {
  input: 'src/index.js',
  globals: { react: 'React' },
  external: ['react'].concat(Object.keys(pkg.dependencies)),
  plugins: commonPlugins,
}

const umdConfig = {
  ...configBase,
  output: {
    file: 'dist/styled-components.js',
    format: 'umd',
    name: 'styled',
    exports: 'named',
  },
  external: ['react'],
}

const devUmdConfig = {
  ...umdConfig,
  plugins: umdConfig.plugins.concat(
    replace({
      'process.env.NODE_ENV': JSON.stringify('development'),
    }),
  ),
}

const prodUmdConfig = {
  ...umdConfig,
  output: {
    ...umdConfig.output,
    file: 'dist/styled-components.min.js',
  },
  plugins: umdConfig.plugins.concat(
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    uglify(),
    visualizer({ filename: './bundle-stats.html' }),
  ),
}

const webConfig = {
  ...configBase,
  output: [{ file: pkg.module, format: 'es' }, { ...cjs, file: pkg.main }],
}

const nativeConfig = {
  ...configBase,
  input: 'src/native/index.js',
  output: { ...cjs, file: pkg['react-native'] },
  external: configBase.external.concat('react-native'),
}

const primitivesConfig = {
  ...configBase,
  input: 'src/primitives/index.js',
  output: [
    { file: 'dist/styled-components-primitives.es.js', format: 'es' },
    { ...cjs, file: 'dist/styled-components-primitives.cjs.js' },
  ],
  external: configBase.external.concat('react-primitives'),
}

const noParserConfig = {
  ...configBase,
  input: 'src/no-parser/index.js',
  output: [
    { file: 'dist/styled-components-no-parser.es.js', format: 'es' },
    { ...cjs, file: 'dist/styled-components-no-parser.cjs.js' },
  ],
}

export default [
  devUmdConfig,
  prodUmdConfig,
  webConfig,
  nativeConfig,
  primitivesConfig,
  noParserConfig,
]
