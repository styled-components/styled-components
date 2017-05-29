import React from 'react'

import SectionLayout from '../../SectionLayout'
import Table, { Row, Column } from '../../Table'
import CodeBlock from '../../CodeBlock'
import Code from '../../Code'

const cssSample = (`
import styled, { css } from 'styled-components';

const complexMixin = css\`
  color: \${props => props.whiteColor ? 'white': 'black'}
\`;

const StyledComp = styled.div\`
  /* This is an example of a nested interpolation */
  \${props => props.complex ? complexMixin : 'color: blue;'}
\`;
`).trim()

const CSS = () => (
  <SectionLayout sub title={<Code>css</Code>} labels={['web', 'native']}>
    <p>
      A helper function to generate CSS from a template literal with interpolations. You need to use this if you return a
      template literal with interpolations inside an interpolation. (This is due to how tagged template literals work)
      <br />
      If you're just returning a normal string you do not need to use this.
    </p>

    <Table head={[ 'Arguments', 'Description' ]}>
      <Row>
        <Column>
          1. <Code>TaggedTemplateLiteral</Code>
        </Column>
        <Column>
          A tagged template literal with your CSS and interpolations.
        </Column>
      </Row>
    </Table>

    <p>
      Returns an array of interpolations, which is a flattened data structure that you can pass as an interpolation
      itself.
    </p>

    <CodeBlock code={cssSample} language="jsx" />

    <p>
      If you leave off the css your function will be <Code>toString()</Code>ed and you'll not get the results
      you expected.
    </p>
  </SectionLayout>
)

export default CSS
