import babel from '@babel/core';
import plugin from 'babel-plugin-macros';
import pluginTester from 'babel-plugin-tester';

const styledExampleCode = `
import styled from 'styled-components/macro'

styled.div\`
  background: \${p => (p.error ? 'red' : 'green')};
\`
`;

const customStyledExampleCode = `
import myStyled from 'styled-components/macro'
import styled from 'another-package'

myStyled.div\`
  background: \${p => (p.error ? 'red' : 'green')};
\`
`;

const cssExampleCode = `
import { css } from 'styled-components/macro'

css\`
  color: \${props => (props.whiteColor ? 'white' : 'black')};
\`
`;

const keyframesExampleCode = `
import { keyframes } from 'styled-components/macro'

keyframes\`
  0% { opacity: 0; }
  100% { opacity: 1; }
\`
`;

const createGlobalStyleExampleCode = `
import { createGlobalStyle } from 'styled-components/macro'

createGlobalStyle\`
  background: red;
\`
`;

const ThemeProviderExampleCode = `
import { ThemeProvider } from 'styled-components/macro'

React.createComponent(
  ThemeProvider,
  { theme: { color: 'red' }},
  'hello'
)
`;

const extendsExampleCode = `
import React from 'react'
import styled from 'styled-components/macro'

const Hello = () => React.createComponent(div, null, 'hello')

styled(Hello)\`
  background: red;
\`
`;

const multipleImportsExampleCode = `
import styled, { css } from 'styled-components/macro'
`;

const requireExampleCode = `
const styled = require('styled-components/macro')

styled.div\`
  background: red;
\`
`;

const withTypeImportExampleCode = `
import { DefaultTheme } from 'styled-components/macro'
`;

const withTypeAndStandardImportExampleCode = `
  import styled, { DefaultTheme } from 'styled-components/macro'
`;

const cssPropExampleCode = `
import styled from 'styled-components/macro'
import React from 'react';
function Foo() {
  return <div css="color: red;" />;
}
`;

const cssPropOverridingComponentExampleCode = `
import React from 'react';
import styled from 'styled-components/macro'
const Thing = styled.div\`
  color: blue;
\`;
function Foo() {
  return <Thing css="color: red;" />;
}
`;

pluginTester({
  title: 'macro',
  plugin,
  snapshot: true,
  babelOptions: {
    babelrc: false,
    filename: __filename,
    presets: [
      '@babel/preset-react',
      ['@babel/preset-typescript', { allExtensions: true, isTSX: true }],
    ],
  },
  babel,
  tests: {
    'should work with styled': {
      code: styledExampleCode,
    },
    'should work with custom import name': {
      code: customStyledExampleCode,
    },
    'should work with { css }': {
      code: cssExampleCode,
    },
    'should work with { keyframes }': {
      code: keyframesExampleCode,
    },
    'should work with { createGlobalStyle }': {
      code: createGlobalStyleExampleCode,
    },
    'should work with { ThemeProvider }': {
      code: ThemeProviderExampleCode,
    },
    'should work when extending a component': {
      code: extendsExampleCode,
    },
    'should work with require() to import styled-components': {
      code: requireExampleCode,
    },
    'should work with multiple imports': {
      code: multipleImportsExampleCode,
    },
    'should work with types': {
      code: withTypeImportExampleCode,
    },
    'should work with types alongside import': {
      code: withTypeAndStandardImportExampleCode,
    },
    'should not add componentId with a config disabling ssr': {
      code: styledExampleCode,
      // @ts-expect-error overriding test config
      pluginOptions: {
        styledComponents: {
          ssr: false,
        },
      },
    },
    'should work with the css prop': { code: cssPropExampleCode },
    'should work with the css prop overriding an existing styled-component': {
      code: cssPropOverridingComponentExampleCode,
    },
    'should use a custom import with importModuleName': {
      code: styledExampleCode,
      pluginOptions: {
        styledComponents: {
          importModuleName: '@xstyled/styled-components',
        },
      },
    },
  },
});
