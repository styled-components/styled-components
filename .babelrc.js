const { BABEL_ENV, NODE_ENV } = process.env
const modules = BABEL_ENV === 'cjs' || NODE_ENV === 'test' ? 'commonjs' : false

const loose = true

module.exports = {
  presets: [
    ['env', { loose, modules }],
    'react'
  ],
  plugins: [
    'flow-react-proptypes',
    ['transform-react-remove-prop-types', { mode: 'unsafe-wrap' }],
    'transform-object-rest-spread',
    ['transform-class-properties', { loose }],
    modules === 'commonjs' && 'add-module-exports',
  ].filter(Boolean)
}
