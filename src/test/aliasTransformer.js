// @flow
import { createTransformer } from 'babel-jest'

module.exports = createTransformer({
  plugins: [
    ['module-alias', [
      { react: 'preact-compat' },
      { 'react-dom': 'preact-compat' },
    ]],
  ],
})
