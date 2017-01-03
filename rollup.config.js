/* eslint-disable flowtype/require-valid-file-annotation, no-console */
const nodeResolve = require('rollup-plugin-node-resolve')
const replace = require('rollup-plugin-replace')
const commonjs = require('rollup-plugin-commonjs')
const inject = require('rollup-plugin-inject')
const babel = require('rollup-plugin-babel')
const json = require('rollup-plugin-json')
const flow = require('rollup-plugin-flow')
const uglify = require('rollup-plugin-uglify')
const visualizer = require('rollup-plugin-visualizer')

const processShim = '\0process-shim'

const prod = process.env.PRODUCTION
const mode = prod ? 'production' : 'development'

console.log(`Creating ${mode} bundle...`)

const targets = prod ?
[
  { dest: 'dist/styled-components.min.js', format: 'umd' },
] :
[
  { dest: 'dist/styled-components.js', format: 'umd' },
  { dest: 'dist/styled-components.es.js', format: 'es' },
]

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
  nodeResolve({
    preferBuiltins: true,
  }),
  commonjs(),
  replace({
    'process.env.NODE_ENV': JSON.stringify(prod ? 'production' : 'development'),
  }),
  inject({
    process: processShim,
  }),
  babel({
    babelrc: false,
    presets: [
      ['latest', { es2015: { modules: false } }],
      'react',
    ],
    plugins: [
      'flow-react-proptypes',
      'transform-flow-strip-types',
      'external-helpers',
      'transform-object-rest-spread',
      'transform-class-properties',
    ],
    exclude: [
      'node_modules/**',
      '*.json',
    ],
  }),
  json(),
]

if (prod) plugins.push(uglify(), visualizer({ filename: './bundle-stats.html' }))

module.exports = {
  entry: 'src/index.js',
  moduleName: 'styled',
  external: ['react'],
  exports: 'named',
  targets,
  plugins,
  globals: { react: 'React' },
}
