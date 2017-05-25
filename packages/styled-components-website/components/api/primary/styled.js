import React from 'react'

import SectionLayout from '../../SectionLayout'
import Table, { Row, Column } from '../../Table'
import Link from '../../Link'
import CodeBlock from '../../CodeBlock'
import Code from '../../Code'
import Note from '../../Note'

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

const attrsSample = (`
import styled from 'styled-components';

const Input = styled.input.attrs({
  type: 'text',
  size: props => props.small ? 3 : 8
})\`
  background: palevioletred;
  border-radius: 3px;
  border: none;
  color: white;
  padding: \${props => props.padding}
\`;
`).trim()

const Styled = () => (
  <SectionLayout sub title={<Code>styled</Code>} labels={[ 'web', 'native' ]}>
    <p>
      This is the default export.
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

    <CodeBlock code={styledSample} language="jsx" />

    <Note>
      We encourage you to not use the <Code>styled('tagname')</Code> notation directly.
      Instead, rely on the <Code>styled.tagname</Code> methods like <Code>styled.button</Code>.
      We define all valid HTML5 and SVG elements. (It's an automatic fat finger check too)
    </Note>

    <p>
      {'You can see this method being introduced in the '}
      <Link
        inline
        href="/docs/basics#getting-started"
      >
        Getting started
      </Link>
      {' section.'}
    </p>

    <SectionLayout sub title=".attrs">
      <p>
        This is a chainable method that attaches some props to a styled component.
        The first and only argument is an object that will be merged into the rest of the
        component's props. The <Code>attrs</Code> object accepts the following values:
      </p>

      <Table head={[ 'Values', 'Description' ]}>
        <Row>
          <Column>
            <Code>Prop Value</Code>
          </Column>
          <Column>
            These can be of any type, except functions. They'll stay static and will be
            merged into the existing component props.
          </Column>
        </Row>

        <Row>
          <Column>
            <Code>Prop Factory</Code>
          </Column>
          <Column>
            A function that receives the props that are passed into the component and computes
            a value, that is then going to be merged into the existing component props.
          </Column>
        </Row>
      </Table>

      Returns another <Code>Styled Component</Code>.

      <CodeBlock code={attrsSample} language="jsx" />

      <p>
        {'Learn more about this constructor in the '}
        <Link
          inline
          href="/docs/basics#attaching-additional-props"
        >
          Attaching Additional Props
        </Link>
        {' section.'}
      </p>
    </SectionLayout>
  </SectionLayout>
)

export default Styled
