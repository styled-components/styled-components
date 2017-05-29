import React from 'react'
import SectionLayout from '../SectionLayout'
import CodeBlock from '../CodeBlock'

const sample = (`
// Oh no! The user has given us a bad URL!
const userInput = '/api/withdraw-funds';

const ArbitraryComponent = styled.div\`
  background: url(\${userInput});
  /* More styles here... */
\`;
`).trim()

const Security = () => (
  <SectionLayout title="Security">
    <p>
      Since styled-components allows you to use arbitrary input as interpolations, you must be
      careful to sanitize that input. Using user input as styles can lead to any CSS being evaluated in the user's
      browser that an attacker can place in your application.
    </p>

    <p>
      This example shows how bad user input can even lead to API endpoints being called on a user's
      behalf.
    </p>

    <CodeBlock code={sample} language="jsx" />

    <p>
      Be very careful! This is obviously a made-up example, but CSS injection can be unobvious and
      have bad repercussions. Some IE versions even execute arbitrary JavaScript within url declarations.
    </p>
  </SectionLayout>
)

export default Security
