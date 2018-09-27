import pluginTester from 'babel-plugin-tester'
import plugin from 'babel-plugin-macros'

const basicExampleCode = `
import styled from '../../macro'

styled.div\`
  background: red;
\`
`

const advancedExampleCode = `
import React from 'react'
import styled from '../../macro'

const Hello = () => React.createComponent(div, null, 'hello')

styled(Hello)\`
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
    'should work when extending a component': advancedExampleCode,
  },
})
