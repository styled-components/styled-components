import React from 'react'

import SectionLayout from '../../SectionLayout'
import Table, { Row, Column } from '../../Table'
import Link from '../../Link'
import CodeBlock from '../../CodeBlock'
import Code from '../../Code'

const themingSample = (`
import styled, { ThemeProvider } from 'styled-components';

const Box = styled.div\`
  color: \${props => props.theme.color};
\`;

<ThemeProvider theme={{ color: 'mediumseagreen' }}>
  <Box>I'm mediumseagreen!</Box>
</ThemeProvider>
`).trim()

const ThemeProvider = () => (
  <SectionLayout sub title={<Code>ThemeProvider</Code>} labels={[ 'web', 'native' ]}>
    <p>
      A helper component for theming. Injects the theme into all styled components anywhere
      beneath it in the component tree, via the context API.
      {' Check the section on '}
      <Link
        inline
        href="/docs/advanced#theming"
      >
        Theming
      </Link>
      .
    </p>

    <Table head={[ 'Props', 'Description' ]}>
      <Row>
        <Column>
          <Code>theme</Code>
        </Column>
        <Column>
          An object that will be injected as <Code>theme</Code> into all interpolations in styled components
          beneath the provider.
        </Column>
      </Row>
    </Table>

    <CodeBlock code={themingSample} language="jsx" />
  </SectionLayout>
)

export default ThemeProvider
