import path from 'path'
import pluginTester from 'babel-plugin-tester'
import plugin from 'babel-macros'
import macro from '../../macro';

pluginTester({
  plugin,
  snapshot: true,
  tests: withFilename([{
    code: `
      import styled from '../../macro'

      styled.div\`
        background: papayawhip;
      \`
    `
  },
    `
      import React from 'react';
      import macro from '../../macro'

      class Test extends React.Component {
        render() {
          return React.createElement('div', null, 'Hello World')
        }
      }
      const StyledTest = macro(Test)\`
        background: \${props => props.theme.background};
        color: red;
      \`

      export default StyledTest
    `
  ]),
})

/*
 * This adds the filename to each test so you can do require/import relative
 * to this test file.
 */
function withFilename(tests) {
  return tests.map(t => {
    const test = {babelOptions: {filename: __filename}}
    if (typeof t === 'string') {
      test.code = t
    } else {
      Object.assign(test, t)
    }
    return test
  })
}