import React from 'react'
import SectionLayout from '../SectionLayout'
import LiveEdit from '../LiveEdit'
import Code from '../Code'
import Note from '../Note'

const sample = (`
// This could be react-router's Link for example
const Link = ({ className, children }) => (
  <a className={className}>
    {children}
  </a>
)

const StyledLink = styled(Link)\`
  color: palevioletred;
  font-weight: bold;
\`;

render(
  <div>
    <Link>Unstyled, boring Link</Link>
    <br />
    <StyledLink>Styled, exciting Link</StyledLink>
  </div>
);
`).trim()

const StylingAnyComponents = () => (
  <SectionLayout title="Styling any components">
    <p>
      The <Code>styled</Code> method works perfectly on all of your own or any third-party
      components as well, as long as they're accepting the <Code>className</Code> prop.
    </p>

    <p>
      If you're using any external library, you can consider using this pattern to turn them
      into styled components. The same pattern works for your own components as well, if you
      need some components to stay unstyled on their own.
    </p>

    <LiveEdit
      code={sample}
      noInline
    />

    <p>
      You can also pass tag names into the <Code>styled()</Code> call, like so: <Code>styled('div')</Code>.
      <br />
      In fact, the <Code>styled.tagname</Code> helpers are just aliases.
    </p>

    <Note>
      Styled Components always generates a real stylesheet with classes.
      <br />
      The classnames are then passed to the React component (including third party components)
      via the <Code>className</Code> prop.
    </Note>
  </SectionLayout>
)

export default StylingAnyComponents
