import React from 'react'

import SectionLayout from '../../SectionLayout'
import Table, { Row, Column } from '../../Table'
import CodeBlock from '../../CodeBlock'
import Code from '../../Code'

const injectGlobalSample = (`
import { injectGlobal } from 'styled-components';

injectGlobal\`
  @font-face {
    font-family: 'Operator Mono';
    src: url('../fonts/Operator-Mono.ttf');
  }

  body {
    margin: 0;
  }
\`;
`).trim()

const InjectGlobal = () => (
  <SectionLayout sub title={<Code>injectGlobal</Code>} labels={[ 'web', 'native' ]}>
    <p>
      A helper method to write global CSS. It does not return a component, but adds the styles to
      the stylesheet directly.
    </p>

    <Table head={[ 'Arguments', 'Description' ]}>
      <Row>
        <Column>
          1. <Code>TaggedTemplateLiteral</Code>
        </Column>
        <Column>
          A tagged template literal with your global styles inside.
        </Column>
      </Row>
    </Table>

    <CodeBlock code={injectGlobalSample} language="jsx" />

    <p>
      We do not encourage the use of this. Try to use it once per app at most, if you
      must, contained in a single file. This is an escape hatch. Only use it for the
      rare <Code>@font-face</Code> definition or body styling.
    </p>
  </SectionLayout>
)

export default InjectGlobal
