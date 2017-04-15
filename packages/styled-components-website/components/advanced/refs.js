import React from 'react'
import SectionLayout from '../SectionLayout'
import LiveEdit from '../LiveEdit'
import Code from '../Code'

const sample = (`
const Input = styled.input\`
  padding: 0.5em;
  margin: 0.5em;
  color: palevioletred;
  background: papayawhip;
  border: none;
  border-radius: 3px;
\`;

const Form = () => (
  <Input
    placeholder="Hover here..."
    innerRef={x => this.input = x}
    onMouseEnter={() => this.input.focus()}
  />
);

render(
  <Form />
);
`).trim()

const Refs = () => (
  <SectionLayout title="Refs">
    <p>
      Passing a <Code>ref</Code> prop to a styled component will give you a instance of
      the <Code>StyledComponent</Code> wrapper, not to the underlying DOM node.
      So it's not possible to call DOM methods, like <Code>focus</Code> on that wrapper.
    </p>

    <p>
      To get a ref to the actual, wrapped DOM node, pass a callback to the <Code>innerRef</Code> prop instead.
      We don't support string refs (i.e. <Code>innerRef="node"</Code>), since they're already deprecated in
      React.
    </p>

    <p>
      This example uses <Code>innerRef</Code> to save a ref to the styled input and focuses it once the user
      hovers over it.
    </p>

    <LiveEdit
      code={sample}
      noInline
    />
  </SectionLayout>
)

export default Refs
