import React from 'react'
import SectionLayout from '../SectionLayout'
import LiveEdit from '../LiveEdit'
import Code from '../Code'
import Note from '../Note'

const sample = (`
const Input = styled.input.attrs({
  // we can define static props
  type: 'password',

  // or we can define dynamic ones
  margin: props => props.size || '1em',
  padding: props => props.size || '1em'
})\`
  color: palevioletred;
  font-size: 1em;
  border: 2px solid palevioletred;
  border-radius: 3px;

  /* here we use the dynamically computed props */
  margin: \${props => props.margin};
  padding: \${props => props.padding};
\`;

render(
  <div>
    <Input placeholder="A small text input" size="1em" />
    <br />
    <Input placeholder="A bigger text input" size="2em" />
  </div>
);
`).trim()

const AttachingAdditionalProps = () => (
  <SectionLayout title="Attaching additional props" labels={[ 'v2' ]}>
    <p>
      To avoid unnecessary wrappers that just pass on some props to the rendered component,
      or element, you can use the <Code>.attrs</Code> constructor. It allows you to attach
      additional props (or "attributes") to a component.
    </p>

    <p>
      This way you can for example attach static props to an element, or pass a prop third-party prop
      like <Code>activeClassName</Code> to React Router's Link component. Furthermore you can also
      attach more dynamic props to a component. The <Code>.attrs</Code> object also takes functions,
      that receive the props that the component receives. The return value will be merged into the
      resulting props as well.
    </p>

    <p>
      Here we render an <Code>Input</Code> component and attach some dynamic and static attributes
      to it:
    </p>

    <LiveEdit
      code={sample}
      noInline
    />

    <p>
      As you can see, we get access to our newly created props in the interpolations, and
      the <Code>type</Code> attribute is passed down to the element.
    </p>


  </SectionLayout>
)

export default AttachingAdditionalProps
