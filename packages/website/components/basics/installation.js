import React from 'react'
import styled from 'styled-components'
import rem from '../../utils/rem'
import SectionLayout from '../SectionLayout'
import CodeBlock from '../CodeBlock'

const Command = styled(CodeBlock)`
  margin: ${rem(35)} 0;

  &:before {
    content: "$ ";
  }
`

const GettingStarted = ({ url }) => (
  <SectionLayout title="Installation">
    <p>Install styled-components from npm:</p>
    <Command code="npm install --save styled-components"></Command>
  </SectionLayout>
)

export default GettingStarted
