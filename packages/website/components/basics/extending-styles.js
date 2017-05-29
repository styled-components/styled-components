import React from 'react'
import SectionLayout from '../SectionLayout'
import LiveEdit from '../LiveEdit'
import Code from '../Code'
import Note from '../Note'

const sample = (`
// The Button from the last section without the interpolations
const Button = styled.button\`
  color: palevioletred;
  font-size: 1em;
  margin: 1em;
  padding: 0.25em 1em;
  border: 2px solid palevioletred;
  border-radius: 3px;
\`;

// We're extending Button with some extra styles
const TomatoButton = Button.extend\`
  color: tomato;
  border-color: tomato;
\`;

render(
  <div>
    <Button>Normal Button</Button>
    <TomatoButton>Tomato Button</TomatoButton>
  </div>
);
`).trim()

const withComponentSample = (`
const Button = styled.button\`
  display: inline-block;
  color: palevioletred;
  font-size: 1em;
  margin: 1em;
  padding: 0.25em 1em;
  border: 2px solid palevioletred;
  border-radius: 3px;
\`;

// We're replacing the <button> tag with an <a> tag, but reuse all the same styles
const Link = Button.withComponent('a')

// Use .withComponent together with .extend to both change the tag and use additional styles
const TomatoLink = Link.extend\`
  color: tomato;
  border-color: tomato;
\`;

render(
  <div>
    <Button>Normal Button</Button>
    <Link>Normal Link</Link>
    <TomatoLink>Tomato Link</TomatoLink>
  </div>
);
`).trim()

const ExtendingStyles = () => (
  <SectionLayout title="Extending Styles" labels={['v2']}>
    <p>
      Quite frequently you might want to use a component, but change it slightly for
      a single case. Now you could pass in an interpolated function and change them
      based on some props, but that's quite a lot of effort for overriding the styles
      once.
    </p>

    <p>
      To do this in an easier way you can call <Code>extend</Code> on the component
      to generate another. You style it like any other styled component.
      It overrides duplicate styles from the initial component and keeps the others around.
    </p>

    <p>
      Here we use the button from the last section and create a special one, extending it
      with some colour-related styling.
    </p>

    <LiveEdit
      code={sample}
      noInline
    />

    <p>
      We can see that the new <Code>TomatoButton</Code> still resembles <Code>Button</Code>, while we have only
      added two new rules.
    </p>

    <Note>
      This is different from passing your styled component into styled i.e. <Code>styled(Button)</Code>.
      <br />
      Calling <Code>extend</Code> creates a new stylesheet by extending the old one, and thus doesn't
      generate two classes.
    </Note>

    <p>
      In really rare cases you might want to change which tag or component a styled component renders.
      For this case, we have an escape hatch. You can use the <Code>withComponent</Code> to extend
      the styles and use a different tag altogether.
    </p>

    <LiveEdit
      code={withComponentSample}
      noInline
    />
  </SectionLayout>
)

export default ExtendingStyles
