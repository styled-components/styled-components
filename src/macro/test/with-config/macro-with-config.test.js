import pluginTester from 'babel-plugin-tester';
import plugin from 'babel-plugin-macros';

const exampleCode = `
import styled from '../../../macro'

styled.div\`
  background: red;
\`
`;

pluginTester({
  title: 'macro with config',
  plugin,
  snapshot: true,
  babelOptions: { filename: __filename },
  tests: {
    'should not add componentId with a config disabling ssr': exampleCode,
  },
});
