import React from 'react'
import SectionLayout from '../SectionLayout'
import LiveEdit from '../LiveEdit'
import Note from '../Note'

const sample = (`
// Create a Title component that'll render an <h1> tag with some styles
const Title = styled.h1\`
  font-size: 1.5em;
  text-align: center;
  color: palevioletred;
\`;

// Create a Wrapper component that'll render a <section> tag with some styles
const Wrapper = styled.section\`
  padding: 4em;
  background: papayawhip;
\`;

// Use Title and Wrapper like any other React component – except they're styled!
render(
  <Wrapper>
    <Title>
      Hello World, this is my first styled component!
    </Title>
  </Wrapper>
);
`).trim()

const GettingStarted = ({ url }) => (
  <SectionLayout title="Getting Started">
    <p>
      styled-components utilises tagged template literals to style your components.
    </p>

    <p>
      It removes the mapping between components and styles. This means that when you're defining your styles,
      you're actually creating a normal React component, that has your styles attached to it.
    </p>

    <p>
      This example creates two simple components, a wrapper and a title, with some styles attached to it.
      You can edit the code and get a feel for how you'd work with styled-components.
    </p>

    <LiveEdit
      code={sample}
      noInline
    />

    <Note>
      The CSS rules are automatically vendor prefixed, so you don't have to think about it.
    </Note>
  </SectionLayout>
)

export default GettingStarted
