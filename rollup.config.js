/* eslint-disable flowtype/require-valid-file-annotation, no-console, import/extensions */
import nodeResolve from 'rollup-plugin-node-resolve'
import replace from 'rollup-plugin-replace'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'
import json from 'rollup-plugin-json'
import flow from 'rollup-plugin-flow'
import { terser } from 'rollup-plugin-terser'
import sourceMaps from 'rollup-plugin-sourcemaps'

// rollup-plugin-ignore stopped working, so we'll just remove the import line 😐
const ignore = { "import stream from 'stream';": "'';" }

const cjs = {
  exports: 'named',
  format: 'cjs',
  sourcemap: true,
}

const esm = {
  format: 'esm',
  sourcemap: true,
}

const getCJS = override => Object.assign({}, cjs, override)
const getESM = override => Object.assign({}, esm, override)

const commonPlugins = [
  flow({
    // needed for sourcemaps to be properly generated
    pretty: true,
  }),
  sourceMaps(),
  json(),
  nodeResolve(),
  babel({
    exclude: 'node_modules/**',
    plugins: ['external-helpers'],
  }),
  commonjs({
    ignoreGlobal: true,
    namedExports: {
      'react-is': ['isValidElementType'],
    },
  }),
  replace({
    __DEV__: JSON.stringify(false), // disable flag indicating a Jest run
  }),
]

const configBase = {
  input: './src/index.js',

  // \0 is rollup convention for generated in memory modules
  external: id =>
    !id.startsWith('\0') && !id.startsWith('.') && !id.startsWith('/'),
  plugins: commonPlugins,
}

const globals = { react: 'React' }

const umdBaseConfig = Object.assign({}, configBase, {
  output: {
    exports: 'named',
    file: 'dist/styled-components.js',
    format: 'umd',
    globals,
    name: 'styled',
    sourcemap: true,
  },
  external: Object.keys(globals),
  plugins: configBase.plugins.concat(
    replace(
      Object.assign({}, ignore, {
        __SERVER__: JSON.stringify(false),
      })
    )
  ),
})

const umdConfig = Object.assign({}, umdBaseConfig, {
  plugins: umdBaseConfig.plugins.concat(
    replace({
      'process.env.NODE_ENV': JSON.stringify('development'),
    })
  ),
})

const umdProdConfig = Object.assign({}, umdBaseConfig, {
  output: Object.assign({}, umdBaseConfig.output, {
    file: 'dist/styled-components.min.js',
  }),
  plugins: umdBaseConfig.plugins.concat([
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    terser({
      sourceMap: true,
    }),
  ]),
})

const serverConfig = Object.assign({}, configBase, {
  output: [
    getESM({ file: 'dist/styled-components.esm.js' }),
    getCJS({ file: 'dist/styled-components.cjs.js' }),
  ],
  plugins: configBase.plugins.concat(
    replace({
      __SERVER__: JSON.stringify(true),
    })
  ),
})

const serverProdConfig = Object.assign({}, configBase, serverConfig, {
  output: [
    getESM({ file: 'dist/styled-components.esm.min.js' }),
    getCJS({ file: 'dist/styled-components.cjs.min.js' }),
  ],
  plugins: serverConfig.plugins.concat(
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    terser({
      sourceMap: true,
    })
  ),
})

const browserConfig = Object.assign({}, configBase, {
  output: [
    getESM({ file: 'dist/styled-components.browser.esm.js' }),
    getCJS({ file: 'dist/styled-components.browser.cjs.js' }),
  ],
  plugins: configBase.plugins.concat(
    replace(
      Object.assign({}, ignore, {
        __SERVER__: JSON.stringify(false),
      })
    )
  ),
})

const browserProdConfig = Object.assign({}, configBase, browserConfig, {
  output: [
    getESM({
      file: 'dist/styled-components.browser.esm.min.js',
    }),
    getCJS({
      file: 'dist/styled-components.browser.cjs.min.js',
    }),
  ],
  plugins: browserConfig.plugins.concat(
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    terser({
      sourceMap: true,
    })
  ),
})

const nativeConfig = Object.assign({}, configBase, {
  input: './src/native/index.js',
  output: getCJS({
    file: 'dist/styled-components.native.cjs.js',
  }),
})

const primitivesConfig = Object.assign({}, configBase, {
  input: './src/primitives/index.js',
  output: [
    getESM({ file: 'dist/styled-components-primitivesm.esm.js' }),
    getCJS({
      file: 'dist/styled-components-primitivesm.cjs.js',
    }),
  ],
  plugins: configBase.plugins.concat(
    replace({
      __SERVER__: JSON.stringify(true),
    })
  ),
})

const noParserConfig = Object.assign({}, configBase, {
  input: './src/no-parser/index.js',
  output: [
    getESM({ file: 'dist/styled-components-no-parser.esm.js' }),
    getCJS({ file: 'dist/styled-components-no-parser.cjs.js' }),
  ],
  plugins: configBase.plugins.concat(
    replace({
      __SERVER__: JSON.stringify(true),
    })
  ),
})

const noParserBrowserConfig = Object.assign({}, configBase, {
  output: [
    getESM({
      file: 'dist/styled-components-no-parser.browser.esm.js',
    }),
    getCJS({
      file: 'dist/styled-components-no-parser.browser.cjs.js',
    }),
  ],
  plugins: configBase.plugins.concat(
    replace(
      Object.assign({}, ignore, {
        __SERVER__: JSON.stringify(false),
      })
    )
  ),
})

export default [
  umdConfig,
  umdProdConfig,
  serverConfig,
  serverProdConfig,
  browserConfig,
  browserProdConfig,
  nativeConfig,
  primitivesConfig,
  noParserConfig,
  noParserBrowserConfig,
]
