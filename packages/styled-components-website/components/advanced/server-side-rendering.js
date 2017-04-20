import React from 'react'
import SectionLayout from '../SectionLayout'
import CodeBlock from '../CodeBlock'
import Code from '../Code'
import Note from '../Note'
import Label from '../Label'

const sample = (`
import { renderToString } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'

const sheet = new ServerStyleSheet()
const html = renderToString(sheet.collectStyles(<YourApp />))
const css = sheet.getStyleTags()
`).trim()

const managerSample = (`
import { renderToString } from 'react-dom/server'
import { ServerStyleSheet, StyleSheetManager } from 'styled-components'

const sheet = new ServerStyleSheet()
const html = renderToString(
  <StyleSheetManager sheet={sheet}>
    <YourApp />
  </StyleSheetManager>
)

const css = sheet.getStyleTags()
`).trim()

const ServerSideRendering = () => (
  <SectionLayout title="Server Side Rendering">
    <p>
      <Label>v2</Label>
    </p>

    <p>
      Styled Components supports concurrent server side rendering, with stylesheet rehydration.
      The basic idea is that everytime you render your app on the server, you can create
      a <Code>ServerStyleSheet</Code> and add a provider to your React tree, that accepts styles
      via a context API.
    </p>

    <p>
      This doesn't interfere with global styles, such as <Code>keyframes</Code> or <Code>injectGlobal</Code> and
      allows you to use Styled Components with React DOM's SSR, or even Rapscallion.
    </p>

    <Note>
      Support for next.js is currently possible with a couple of workarounds, but not seamless. We're
      working on an example.
    </Note>

    <p>
      The basic API goes as follows:
    </p>

    <CodeBlock code={sample} />

    <p>
      The <Code>collectStyles</Code> method wraps your element in a provider. Optionally you can use
      the <Code>StyleSheetManager</Code> provider directly, instead of this method. Just make sure not to
      use it on the client-side.
    </p>

    <CodeBlock code={managerSample} />

    <p>
      The <Code>sheet.getStyleTags()</Code> returns a string of multiple <Code>&lt;style&gt;</Code> tags.
      You need to take this into account when adding the CSS string to your HTML output.
    </p>
  </SectionLayout>
)

export default ServerSideRendering
