import pluginTester from 'babel-plugin-tester'
import plugin from 'babel-plugin-macros'

const basicExampleCode = `
import styled from '../../macro'

styled.div\`
  background: red;
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

pluginTester({
  title: 'macro',
  plugin,
  snapshot: true,
  babelOptions: { filename: __filename },
  tests: {
    'should work with a basic example': basicExampleCode,
    'should work when extending a component': extendsExampleCode,
    'should work with require() to import styled-components': requireExampleCode,
  },
})
