import React from 'react'

import SectionLayout from '../SectionLayout'
import { SubHeader } from '../Layout'
import Link from '../Link'
import { CodeBlockRaw } from '../CodeBlock'
import Code from '../Code'

const flowconfig = (`
[ignore]
# We vendor our src directory, which is not needed for type-checking
.*/styled-components/src/.*

[include]

[libs]
# This is where your own flow-typed libdefs go
flow-typed

# These declarations are super explicit...
# We want to show what libdef files we need to make
# flow understand all external dependencies
#
# If you have similar dependencies, you will need to
# check which libdef files are covered by your flow-typed
# directory!
#
# A more generic approach (please use with caution!):
# node_modules/styled-components/flow-typed/*.js

node_modules/styled-components/flow-typed/react-native.js
node_modules/styled-components/flow-typed/lodash_v4.x.x.js
node_modules/styled-components/flow-typed/inline-style-prefixer_vx.x.x.js

[options]
`).trim()

const Flow = ({ url }) => (
  <SectionLayout title="Flow">
    <p>
      {'Styled Components has first-class '}
      <Link inline href="https://flowtype.org">
        Flow
      </Link>
      {' support to help you find typing errors while using our public API.'}
    </p>

    <p>
      Sadly, Flow does not work right out-of-the-box, since there isn't a best practise how to isolate
      typing dependencies etc. on a module level yet. This document should give you an idea how to setup
      your <Code>.flowconfig</Code>, so you can use Styled Components without any hassle.
    </p>

    <SubHeader>
      Libdef Dependencies
    </SubHeader>

    <p>
      A libdef is a descriptive file for an external untyped 3rd party module used by our library.
      You can find all our dependencies in the <Code>flow-typed/</Code> directory.
      All files located in <Code>flow-typed/npm/</Code> are downloaded or auto-stubbed versions via
      the <Code>flow-typed</Code> binary, while files located in <Code>flow-typed/</Code> are
      adapted versions of <Code>flow-typed/npm/</Code> files.
    </p>

    <p>
      Those adapted files might collide with your locally used libdefs like lodash.
      While adapting some libdefs, we made sure not to introduce breaking changes,
      so you can safely use them instead of the official ones found on flow-typed.
    </p>

    <SubHeader>
      Example <Code>.flowconfig</Code>
    </SubHeader>

    <p>
      It's usually easier to just see some example how to set up the <Code>.flowconfig</Code>,
      so here is our current recommendation:
    </p>

    <CodeBlockRaw>
      {flowconfig}
    </CodeBlockRaw>

  </SectionLayout>
)

export default Flow
