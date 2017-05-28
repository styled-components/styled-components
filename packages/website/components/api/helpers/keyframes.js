import React from 'react'

import SectionLayout from '../../SectionLayout'
import Table, { Row, Column } from '../../Table'
import Link from '../../Link'
import CodeBlock from '../../CodeBlock'
import Code from '../../Code'

const keyframesSample = (`
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes\`
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
\`;

const FadeInButton = styled.button\`
  animation: 1s \${fadeIn} ease-out;
\`;
`).trim()

const Keyframes = () => (
  <SectionLayout sub title={<Code>keyframes</Code>} labels={[ 'web' ]}>
    <p>
      A helper method to create keyframes for animations.
    </p>

    <Table head={[ 'Arguments', 'Description' ]}>
      <Row>
        <Column>
          1. <Code>TaggedTemplateLiteral</Code>
        </Column>
        <Column>
          A tagged template literal with your keyframes inside.
        </Column>
      </Row>
    </Table>

    <p>
      Returns a unique name for these keyframes, to be used in your animation declarations.
    </p>

    <CodeBlock code={keyframesSample} language="jsx" />

    <p>
      {'You can learn more about styled-components with Animations in the '}
      <Link
        inline
        href="/docs/basics#animations"
      >
        Animations
      </Link>
      {' section.'}
    </p>
  </SectionLayout>
)

export default Keyframes
