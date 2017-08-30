// @flow
const { createTransformer } = require('babel-jest')

module.exports = createTransformer({
  plugins: [
    ['module-alias', [
      { react: 'preact-compat' },
      { 'react-dom': 'preact-compat' },
    ]],
  ],
})
