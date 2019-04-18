import cosmiconfigMock from 'cosmiconfig';
import pluginTester from 'babel-plugin-tester';
import plugin from 'babel-plugin-macros';

jest.mock('cosmiconfig', () => jest.fn(require.requireActual('cosmiconfig')));

const styledExampleCode = `
import styled from '../../macro'

styled.div\`
  background: \${p => (p.error ? 'red' : 'green')};
\`
`;

const customStyledExampleCode = `
import myStyled from '../../macro'
import styled from 'another-package'

myStyled.div\`
  background: \${p => (p.error ? 'red' : 'green')};
\`
`;

const cssExampleCode = `
import { css } from '../../macro'

css\`
  color: \${props => (props.whiteColor ? 'white' : 'black')};
\`
`;

const keyframesExampleCode = `
import { keyframes } from '../../macro'

keyframes\`
  0% { opacity: 0; }
  100% { opacity: 1; }
\`
`;

const createGlobalStyleExampleCode = `
import { createGlobalStyle } from '../../macro'

createGlobalStyle\`
  background: red;
\`
`;

const ThemeProviderExampleCode = `
import { ThemeProvider } from '../../macro'

React.createComponent(
  ThemeProvider,
  { theme: { color: 'red' }},
  'hello'
)
`;

const extendsExampleCode = `
import React from 'react'
import styled from '../../macro'

const Hello = () => React.createComponent(div, null, 'hello')

styled(Hello)\`
  background: red;
\`
`;

const requireExampleCode = `
const styled = require('../../macro')

styled.div\`
  background: red;
\`
`;

const invalidExampleCode = `
import { UnknownImport } from '../../macro'
`;

pluginTester({
  title: 'macro',
  plugin,
  snapshot: true,
  babelOptions: {
    babelrc: false,
    filename: __filename
  },
  babel: require('@babel/core'),
  tests: {
    'should work with styled': {
      code: styledExampleCode
    },
    'should work with custom import name': {
      code: customStyledExampleCode
    },
    'should work with { css }': {
      code: cssExampleCode
    },
    'should work with { keyframes }': {
      code: keyframesExampleCode
    },
    'should work with { createGlobalStyle }': {
      code: createGlobalStyleExampleCode
    },
    'should work with { ThemeProvider }': {
      code: ThemeProviderExampleCode
    },
    'should work when extending a component': {
      code: extendsExampleCode
    },
    'should work with require() to import styled-components': {
      code: requireExampleCode
    },
    'should throw error when importing { UnknownImport }': {
      code: invalidExampleCode,
      error: true,
      snapshot: false,
    },
    'should not add componentId with a config disabling ssr': {
      code: styledExampleCode,
      setup: () => {
        cosmiconfigMock.mockImplementationOnce(() => ({
          searchSync: () => ({
            config: {
              styledComponents: {
                ssr: false,
              },
            },
          }),
        }));
      },
    },
  },
});
