import React from 'react'
import SectionLayout from '../SectionLayout'
import LiveEdit from '../LiveEdit'
import Code from '../Code'

const sample = (`
const Button = styled.button\`
  /* Adapt the colours based on primary prop */
  background: \${props => props.primary ? 'palevioletred' : 'white'};
  color: \${props => props.primary ? 'white' : 'palevioletred'};

  font-size: 1em;
  margin: 1em;
  padding: 0.25em 1em;
  border: 2px solid palevioletred;
  border-radius: 3px;
\`;

render(
  <div>
    <Button>Normal</Button>
    <Button primary>Primary</Button>
  </div>
);
`).trim()

const AdaptingBasedOnProps = () => (
  <SectionLayout title="Adapting based on props">
    <p>
      You can pass a function ("interpolations") to a styled component's template literal
      to adapt it based on its props.
    </p>

    <p>
      This button component has a primary state that changes its colour.
      When setting the <Code>primary</Code> prop to true, we are swapping out its background and text colour.
    </p>

    <LiveEdit
      code={sample}
      noInline
    />
  </SectionLayout>
)

export default AdaptingBasedOnProps
