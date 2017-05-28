import React from 'react'

import SectionLayout from '../../SectionLayout'
import Table, { Row, Column } from '../../Table'
import Link from '../../Link'
import CodeBlock from '../../CodeBlock'
import Code from '../../Code'

const taggedTemplateLiteralSample = (`
import styled from 'styled-components';

const padding = '3em';

const Section = styled.section\`
  color: white;

  /* Pass variables as inputs */
  padding: \${padding};

  /* Adjust the background from the properties */
  background: \${props => props.background};
\`;
`).trim()

const TaggedTemplateLiteral = () => (
  <SectionLayout sub title={<Code>TaggedTemplateLiteral</Code>} labels={[ 'web', 'native' ]}>
    <p>
      {'This is what you pass into your styled calls – a tagged template literal.'}
      {'This is an ES6 language feature. You can learn more about them in the '}
      <Link
        inline
        href="/docs/advanced#tagged-template-literals"
      >
        Tagged Template Literals
      </Link>
      {' section.'}
    </p>

    <Table head={[ 'Inputs', 'Description' ]}>

      <Row>
        <Column>
          <Code>Rule</Code>
        </Column>
        <Column>
          Any CSS rules (string)
        </Column>
      </Row>

      <Row>
        <Column>
          <Code>Interpolation</Code>
        </Column>
        <Column>
          This can either be a string or a function.
          Strings are combined with the rules as-is.
          Functions will receive the styled component's props as the first and only argument.
        </Column>
      </Row>

    </Table>

    <p>
      {'Read more about how to adapt styling based on props in the '}
      <Link
        inline
        href="/docs/basics#adapting-based-on-props"
      >
        Adapting based on props
      </Link>
      {' section.'}
    </p>

    <p>
      The properties that are passed into an interpolated function get attached a special
      property, <Code>theme</Code>, which is injected by a higher level <Code>ThemeProvider</Code> component.
      {' Check the section on '}
      <Link
        inline
        href="/docs/advanced#theming"
      >
        Theming
      </Link>
      {' for more information on this.'}
    </p>

    <CodeBlock code={taggedTemplateLiteralSample} language="jsx" />

    <p>
      You can also return objects from interpolations or input objects directly, and they'll be
      treated as inline styles. However this is highly discouraged, as the CSS syntax has support
      for pseudo selectors, media queries, nesting, etc., which the object syntax doesn't.
    </p>
  </SectionLayout>
)

export default TaggedTemplateLiteral
