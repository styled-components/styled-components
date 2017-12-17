const { NODE_ENV, UMD, PRODUCTION } = process.env
const test = NODE_ENV === 'test'
const modules = test ? 'commonjs' : false
const prod = !!PRODUCTION

const loose = true

module.exports = {
  presets: [
    ['env', { loose, modules }],
    'react'
  ],
  plugins: [
    !prod && 'flow-react-proptypes',
    prod && 'transform-react-remove-prop-types',
    !test && 'external-helpers',
    'transform-flow-strip-types',
    'transform-object-rest-spread',
    ['transform-class-properties', { loose }],
    // bundles get the same thing from rollup and not from babel
    test && 'add-module-exports',
  ].filter(Boolean)
}
