import React from 'react'
import SectionLayout from '../SectionLayout'
import LiveEdit from '../LiveEdit'

const sample = (`
// Create an Input component that'll render an <input> tag with some styles
const Input = styled.input\`
  padding: 0.5em;
  margin: 0.5em;
  color: palevioletred;
  background: papayawhip;
  border: none;
  border-radius: 3px;
\`;

// Render a styled text input with a placeholder of "@mxstbr", and one with a value of "@geelen"
render(
  <div>
    <Input placeholder="@mxstbr" type="text" />
    <Input value="@geelen" type="text" />
  </div>
);
`).trim()

const PassedProps = () => (
  <SectionLayout title="Passed props">
    <p>
      styled-components pass on all their props.
    </p>

    <p>
      This example shows how all props of the Input component are passed on to the
      DOM node that is mounted, as with React elements.
    </p>

    <LiveEdit
      code={sample}
      noInline
    />
  </SectionLayout>
)

export default PassedProps
