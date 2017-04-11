import React from 'react'
import SectionLayout from '../SectionLayout'
import LiveEdit from '../LiveEdit'
import Code from '../Code'

const sample = (`
// This could be react-router's Link for example
const Link = ({ className, children }) => (
  <a className={className}>
    {children}
  </a>
)

const StyledLink = styled(Link)\`
  color: \${props => props.primary ? 'white' : 'palevioletred'};
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

const ThirdPartyComponents = () => (
  <SectionLayout title="Third-Party Components">
    <p>
      Overriding component styles, as can be seen above, works perfectly on any third-party
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
  </SectionLayout>
)

export default ThirdPartyComponents
