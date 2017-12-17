/* eslint-disable flowtype/require-valid-file-annotation, no-console, import/extensions */
import nodeResolve from 'rollup-plugin-node-resolve'
import replace from 'rollup-plugin-replace'
import commonjs from 'rollup-plugin-commonjs'
import inject from 'rollup-plugin-inject'
import babel from 'rollup-plugin-babel'
import json from 'rollup-plugin-json'
import flow from 'rollup-plugin-flow'
import uglify from 'rollup-plugin-uglify'
import visualizer from 'rollup-plugin-visualizer'
import pkg from './package.json'

const processShim = '\0process-shim'

const {
  PRODUCTION,
  UMD,
  BABEL_ENV,
  ESBUNDLE,
  CJSBUNDLE,
  NATIVEBUNDLE,
  PRIMITIVESBUNDLE,
  NOPARSERBUNDLE,
} = process.env

let input
let output
if (UMD && PRODUCTION) {
  console.log('Creating production UMD bundle...')
  input = 'src/index.js'
  output = [
    { file: 'dist/styled-components.min.js', format: 'umd', name: 'styled' },
  ]
} else if (UMD) {
  console.log('Creating development UMD bundle')
  input = 'src/index.js'
  output = [
    { file: 'dist/styled-components.js', format: 'umd', name: 'styled' },
  ]
} else if (ESBUNDLE) {
  console.log('Creating ES modules bundle...')
  input = 'src/index.js'
  output = [{ file: 'dist/styled-components.es.js', format: 'es' }]
} else if (CJSBUNDLE) {
  console.log('Creating CJS modules bundle...')
  input = 'src/index.js'
  output = [{ file: 'dist/styled-components.cjs.js', format: 'cjs' }]
} else if (NATIVEBUNDLE) {
  console.log('Creating React Native bundle...')
  input = 'src/native/index.js'
  output = [{ file: 'dist/styled-components.native.js', format: 'cjs' }]
} else if (PRIMITIVESBUNDLE) {
  console.log('Creating React Primitives bundle...')
  input = 'src/primitives/index.js'
  output = [{ file: 'dist/styled-components.primitives.js', format: 'cjs' }]
} else if (NOPARSERBUNDLE && BABEL_ENV === 'cjs') {
  console.log('Creating CJS no parser bundle...')
  input = 'src/no-parser/index.js'
  output = [{ file: 'dist/styled-components-no-parser.cjs.js', format: 'cjs' }]
} else if (NOPARSERBUNDLE) {
  console.log('Creating ES no parser bundle...')
  input = 'src/no-parser/index.js'
  output = [{ file: 'dist/styled-components-no-parser.es.js', format: 'es' }]
} else {
  throw new Error('Unknown bundle type.')
}
output[0].exports = 'named'

const plugins = [
  // Unlike Webpack and Browserify, Rollup doesn't automatically shim Node
  // builtins like `process`. This ad-hoc plugin creates a 'virtual module'
  // which includes a shim containing just the parts the bundle needs.
  {
    resolveId(importee) {
      if (importee === processShim) return importee
      return null
    },
    load(id) {
      if (id === processShim) return 'export default { argv: [], env: {} }'
      return null
    },
  },
  flow(),
  json(),
  nodeResolve(),
  commonjs({
    ignoreGlobal: true,
  }),
  UMD &&
    replace({
      'process.env.NODE_ENV': JSON.stringify(
        PRODUCTION ? 'production' : 'development',
      ),
    }),
  PRODUCTION &&
    inject({
      process: processShim,
    }),
  babel(),
].filter(Boolean)

if (PRODUCTION) {
  plugins.push(uglify(), visualizer({ filename: './bundle-stats.html' }))
}

export default {
  input,
  external: ['react', 'react-native', 'react-primitives'].concat(
    !UMD ? Object.keys(pkg.dependencies) : [],
  ),
  output,
  plugins,
  globals: { react: 'React' },
  outro: BABEL_ENV === 'cjs' ? "module.exports = exports['default']" : '',
}
