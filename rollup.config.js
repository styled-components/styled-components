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

const processShim = '\0process-shim'

const prod = process.env.PRODUCTION
const noParser = process.env.NOPARSER
const mode = prod ? 'production' : 'development'
const entryName = noParser ? 'no-parser' : 'styled-components'

console.log(`Creating ${mode} bundle for the ${entryName} entry...`)

const targets = prod ?
[
  { dest: `dist/${entryName}.min.js`, format: 'umd' },
] :
[
  { dest: `dist/${entryName}.js`, format: 'umd' },
  { dest: `dist/${entryName}.es.js`, format: 'es' },
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
  nodeResolve(),
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
  }),
  json(),
]

if (prod) plugins.push(uglify(), visualizer({ filename: `./bundle-stats-${entryName}.html` }))

export default {
  entry: noParser ? 'src/no-parser/index.js' : 'src/index.js',
  moduleName: 'styled',
  external: ['react'],
  exports: 'named',
  targets,
  plugins,
  globals: { react: 'React' },
}
