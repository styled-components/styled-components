import React from 'react'

import SectionLayout from '../SectionLayout'
import { InlineLink } from '../Link'
import { CodeBlockRaw } from '../CodeBlock'
import Code from '../Code'

const install = (`
npm i -g flow-typed # if you do not already have flow-typed

flow-typed install styled-components@<version>
`).trim()

const flowconfig = (`
[ignore]
.*/node_modules/styled-components/.*
`).trim()

const Flow = ({ url }) => (
  <SectionLayout title="Flow">
    <p>
      {'Styled Components has first-class '}
      <InlineLink href="https://flowtype.org">
        Flow
      </InlineLink>
      {' support to help you find typing errors while using our public API.'}
    </p>

    <p>
      To use Flow with the public api of Styled Components we recommend that you use the library definition in <Code>flow-typed</Code>.
      To install it you can use the <Code>flow-typed</Code> cli or download it manually from the git repository and store it in
      a <Code>flow-typed/</Code> folder in the same directory with your <Code>flowconfig</Code>.
    </p>

    <SectionLayout sub title="Installing the definitions">
      <CodeBlockRaw>
        {install}
      </CodeBlockRaw>
    </SectionLayout>

    <SectionLayout sub title="Ignore Styled Components source">
      <p>
        You should add the following lines to your <Code>.flowconfig</Code>, if you run into Flow errors, coming from the Styled Components
        package in your <Code>node_modules</Code> directory.
      </p>

      <CodeBlockRaw>
        {flowconfig}
      </CodeBlockRaw>
    </SectionLayout>
  </SectionLayout>
)

export default Flow
