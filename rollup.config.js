/* eslint-disable flowtype/require-valid-file-annotation, no-console, import/extensions */
import nodeResolve from 'rollup-plugin-node-resolve'
import replace from 'rollup-plugin-replace'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'
import json from 'rollup-plugin-json'
import flow from 'rollup-plugin-flow'
import uglify from 'rollup-plugin-uglify'
import visualizer from 'rollup-plugin-visualizer'
import sourceMaps from 'rollup-plugin-sourcemaps'
import ignore from 'rollup-plugin-ignore'
import pkg from './package.json'

const cjs = {
  format: 'cjs',
  exports: 'named',
}

const commonPlugins = [
  flow({
    // needed for sourcemaps to be properly generated
    pretty: true,
  }),
  json(),
  nodeResolve(),
  sourceMaps(),
  commonjs({
    ignoreGlobal: true,
  }),
  babel({
    plugins: ['external-helpers'],
  }),
  replace({
    __DEV__: JSON.stringify(false), // disable flag indicating a Jest run
  }),
]

const configBase = {
  input: 'src/index.js',
  globals: { react: 'React' },
  external: ['react'].concat(Object.keys(pkg.dependencies)),
  plugins: commonPlugins,
  sourcemap: true,
}

const umdConfig = Object.assign({}, configBase, {
  output: {
    file: 'dist/styled-components.js',
    format: 'umd',
    name: 'styled',
    exports: 'named',
  },
  external: ['react'],
  plugins: configBase.plugins.concat(
    replace({
      __SERVER__: JSON.stringify(false),
    }),
    ignore(['stream'])
  ),
})

const devUmdConfig = Object.assign({}, umdConfig, {
  plugins: umdConfig.plugins.concat(
    replace({
      'process.env.NODE_ENV': JSON.stringify('development'),
    })
  ),
})

const prodUmdConfig = Object.assign({}, umdConfig, {
  output: Object.assign({}, umdConfig.output, {
    file: 'dist/styled-components.min.js',
  }),
  plugins: umdConfig.plugins.concat([
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      "export * from './secretInternals'": '',
    }),
    uglify({
      sourceMap: true,
    }),
    visualizer({ filename: './bundle-stats.html' }),
  ]),
})

const serverConfig = Object.assign({}, configBase, {
  external: configBase.external.concat('stream'),
  output: [
    { file: 'dist/styled-components.es.js', format: 'es' },
    Object.assign({}, cjs, { file: 'dist/styled-components.cjs.js' }),
  ],
  plugins: configBase.plugins.concat(
    replace({
      __SERVER__: JSON.stringify(true),
    })
  ),
})

const browserConfig = Object.assign({}, configBase, {
  output: [
    { file: 'dist/styled-components.browser.es.js', format: 'es' },
    Object.assign({}, cjs, { file: 'dist/styled-components.browser.cjs.js' }),
  ],
  plugins: configBase.plugins.concat(
    replace({
      __SERVER__: JSON.stringify(false),
      "export * from './secretInternals'": '',
    }),
    ignore(['stream'])
  ),
})

const nativeConfig = Object.assign({}, configBase, {
  input: 'src/native/index.js',
  output: Object.assign({}, cjs, { file: 'dist/styled-components.native.js' }),
  external: configBase.external.concat('react-native'),
})

const primitivesConfig = Object.assign({}, configBase, {
  input: 'src/primitives/index.js',
  output: [
    { file: 'dist/styled-components-primitives.es.js', format: 'es' },
    Object.assign({}, cjs, {
      file: 'dist/styled-components-primitives.cjs.js',
    }),
  ],
  external: configBase.external.concat('react-primitives'),
  plugins: configBase.plugins.concat(
    replace({
      __SERVER__: JSON.stringify(true),
    })
  ),
})

const noParserConfig = Object.assign({}, configBase, {
  external: configBase.external.concat('stream'),
  input: 'src/no-parser/index.js',
  output: [
    { file: 'dist/styled-components-no-parser.es.js', format: 'es' },
    Object.assign({}, cjs, { file: 'dist/styled-components-no-parser.cjs.js' }),
  ],
  plugins: configBase.plugins.concat(
    replace({
      __SERVER__: JSON.stringify(true),
    })
  ),
})

const noParserBrowserConfig = Object.assign({}, configBase, {
  output: [
    { file: 'dist/styled-components-no-parser.browser.es.js', format: 'es' },
    Object.assign({}, cjs, {
      file: 'dist/styled-components-no-parser.browser.cjs.js',
    }),
  ],
  plugins: configBase.plugins.concat(
    replace({
      __SERVER__: JSON.stringify(false),
    }),
    ignore(['stream'])
  ),
})

export default [
  devUmdConfig,
  prodUmdConfig,
  serverConfig,
  browserConfig,
  nativeConfig,
  primitivesConfig,
  noParserConfig,
  noParserBrowserConfig,
]
