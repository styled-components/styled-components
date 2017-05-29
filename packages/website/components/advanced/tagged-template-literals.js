import React from 'react'
import SectionLayout from '../SectionLayout'
import CodeBlock from '../CodeBlock'
import Code from '../Code'
import { InlineLink } from '../Link'

const basicSample = (`
// These are equivalent:
fn\`some string here\`;
fn([ 'some string here' ]);
`).trim()

const interpolationsSample = (`
const aVar = 'good';

// These are equivalent:
fn\`this is a \${aVar} day\`;
fn([ 'this is a ', ' day' ], aVar);
`).trim()

const TaggedTemplateLiterals = () => (
  <SectionLayout title="Tagged Template Literals">
    <p>
      Tagged Template Literals are a new feature in ES6. They let you define custom string interpolation rules,
      which is how we're able to create styled components.
    </p>

    <p>
      If you pass no interpolations, the first argument your function receives is an array with a string in it.
    </p>

    <CodeBlock code={basicSample} language="jsx" />

    <p>
      Once you pass interpolations, the array contains the passed string, split at the positions of the interpolations.
      The rest of the arguments will be the interpolations, in order.
    </p>

    <CodeBlock code={interpolationsSample} language="jsx" />

    <p>
      This is a bit cumbersome to work with, but it means that we can receive variables, functions, or mixins
      (<Code>css``</Code>) in styled components and can flatten that into pure CSS.
    </p>

    <p>
      If you want to learn more about tagged template literals, check out Max Stoiber's article:
      <br />
      <InlineLink href="https://mxstbr.blog/2016/11/styled-components-magic-explained/">
        The magic behind 💅 styled-components
      </InlineLink>
    </p>
  </SectionLayout>
)

export default TaggedTemplateLiterals
