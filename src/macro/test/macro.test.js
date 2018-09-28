import pluginTester from 'babel-plugin-tester'
import plugin from 'babel-plugin-macros'

import * as styledTopLevel from '../../'
import { allowedImports } from '../../macro'

const basicExampleCode = `
import styled from '../../macro'

styled.div\`
  background: \${p => (p.error ? 'red' : 'green')};
\`
`

const extendsExampleCode = `
import React from 'react'
import styled from '../../macro'

const Hello = () => React.createComponent(div, null, 'hello')

styled(Hello)\`
  background: red;
\`
`

const requireExampleCode = `
const myStyled = require('../../macro')

myStyled.div\`
  background: red;
\`
`

const cssExampleCode = `
import { css } from '../../macro'

css\`
  color: \${props => (props.whiteColor ? 'white' : 'black')};
\`
`

const invalidExampleCode = `
import { UnknownImport } from '../../macro'
`

pluginTester({
  title: 'macro',
  plugin,
  snapshot: true,
  babelOptions: { filename: __filename },
  tests: {
    'should work with a basic example': basicExampleCode,
    'should work when extending a component': extendsExampleCode,
    'should work with require() to import styled-components': requireExampleCode,
    'should work with css': cssExampleCode,
    'should throw error when importing { UnknownImport }': {
      code: invalidExampleCode,
      error: true,
      snapshot: false,
    },
  },
})

test('should allow all helpers exported from styled-components', () => {
  const styledExports = Object.keys(styledTopLevel).filter(
    helper => helper !== '__esModule'
  )

  expect(styledExports).toEqual(allowedImports)
})
