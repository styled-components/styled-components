import React from 'react'
import { withTheme, ThemeProvider } from 'styled-components'

import SectionLayout from '../SectionLayout'
import { SubHeader } from '../Layout'
import Table, { Row, Column } from '../Table'
import LiveEdit from '../LiveEdit'
import CodeBlock from '../CodeBlock'
import Code from '../Code'

const styledSample = (`
import styled from 'styled-components';

const Button = styled.button\`
  background: palevioletred;
  border-radius: 3px;
  border: none;
  color: white;
\`;

const TomatoButton = styled(Button)\`
  background: tomato;
\`;
`).trim()

const Primary = () => (
  <SectionLayout title="Primary">
    <SubHeader>
      <Code>
        styled
      </Code>
    </SubHeader>

    <p>
      Default export. For web and native.<br />
      This is a low-level factory we use to create the <Code>styled.tagname</Code> helper methods.
    </p>

    <Table head={[ 'Arguments', 'Description' ]}>

      <Row>
        <Column>
          1. <Code>component</Code> / <Code>tagname</Code>
        </Column>
        <Column>
          Either a valid react component or a tagname like <Code>'div'</Code>.
        </Column>
      </Row>

    </Table>

    <p>
      Returns a function that accepts a tagged template literal and turns it into a <Code>Styled Component</Code>.
    </p>

    <CodeBlock code={styledSample} />

    <p>
      We encourage you to not use the <Code>styled('tagname')</Code> notation directly.
      Instead, rely on the <Code>styled.tagname</Code> methods like <Code>styled.button</Code>.
      We define all valid HTML5 and SVG elements. (It's an automatic fat finger check too)
    </p>
  </SectionLayout>
)

export default Primary
