import React from 'react'
import SectionLayout from '../SectionLayout'
import LiveEdit from '../LiveEdit'
import Code from '../Code'

const sample = (`
const Content = styled.div\`
  background: papayawhip;
  height: 3em;
  width: 3em;

  @media (max-width: 700px) {
    background: palevioletred;
  }
\`;

render(
  <Content />
);
`).trim()

const templateSample = (`
const sizes = {
  desktop: 992,
  tablet: 768,
  phone: 376
}

// Iterate through the sizes and create a media template
const media = Object.keys(sizes).reduce((acc, label) => {
  acc[label] = (...args) => css\`
    @media (max-width: \${sizes[label] / 16}em) {
      \${css(...args)}
    }
  \`

  return acc
}, {})

const Content = styled.div\`
  height: 3em;
  width: 3em;
  background: papayawhip;

  /* Now we have our methods on media and can use them instead of raw queries */
  \${media.desktop\`background: dodgerblue;\`}
  \${media.tablet\`background: mediumseagreen;\`}
  \${media.phone\`background: palevioletred;\`}
\`;

render(
  <Content />
);
`).trim()

const MediaTemplates = () => (
  <SectionLayout title="Media Templates">
    <p>
      Media queries are an indispensable tool when developing responsive web apps.
    </p>

    <p>
      This is a very simple example that shows a basic component changing its background colour
      based on the width of the screen.
    </p>

    <LiveEdit
      code={sample}
      noInline
    />

    <p>
      Due to the functional nature of JavaScript, you can easily define your own tagged template
      literal to wrap styles in media queries. Let's rewrite the last example to try just that out.
    </p>

    <LiveEdit
      code={templateSample}
      noInline
    />
  </SectionLayout>
)

export default MediaTemplates
