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
const css = sheet.getStyleTags() // or sheet.getStyleElement()
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

const css = sheet.getStyleTags() // or sheet.getStyleElement()
`).trim()

const nextSample = (`
import Document, { Head, Main, NextScript } from 'next/document'
import { ServerStyleSheet } from 'styled-components'

export default class MyDocument extends Document {
  render() {
    const sheet = new ServerStyleSheet()
    const main = sheet.collectStyles(<Main />)
    const styleTags = sheet.getStyleElement()

    return (
      <html>
        <Head>
          {/* ... */}

          {styleTags}
        </Head>

        <body>
          <div className="root">
            {main}
          </div>

          <NextScript />
        </body>
      </html>
    )
  }
}
`).trim()

const nextSample = (`
import Document, { Head, Main, NextScript } from 'next/document'
import { ServerStyleSheet } from 'styled-components'

export default class MyDocument extends Document {
  render() {
    const sheet = new ServerStyleSheet()
    const main = sheet.collectStyles(<Main />)
    const styleTags = sheet.getStyleElement()

    return (
      <html>
        <Head>
          {/* ... */}

          {styleTags}
        </Head>

        <body>
          <div className="root">
            {main}
          </div>

          <NextScript />
        </body>
      </html>
    )
  }
}
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

    <p>
      Alternatively the <Code>ServerStyleSheet</Code> instance also has a <Code>getStyleElement()</Code> method
      that returns an array of React elements.
    </p>

    <SectionLayout sub title="Next.js">
      <p>
        In Next.js, you will need to structure your <Code>_document.js</Code> file differently, than
        the provided example in their repository for v1.
      </p>

      <CodeBlock code={nextSample} />

      <p>
        Here we're wrapping the <Code>Main</Code> component, which contains the Next.js app, and are using this
        to extract the styles on the server side.
      </p>

      <Note>
        This is unfortunately only a workaround! It will accumulate rules over time, so you will need
        to cache the SSR response to mitigate this for now.
      </Note>
    </SectionLayout>
  </SectionLayout>
)

export default ServerSideRendering
