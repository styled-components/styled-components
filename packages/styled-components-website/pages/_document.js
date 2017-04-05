import Document, { Head, Main, NextScript } from 'next/document'
import normalize from 'polished/lib/mixins/normalize'
import { injectGlobal, styleSheet } from 'styled-components'

injectGlobal`
  ${normalize(true)}

  html, body {
    font-size: 16px;
    line-height: 1.6;
    font-family: 'Avenir Next', sans-serif;
    font-weight: normal;
    font-style: normal;
    padding: 0;
    margin: 0;
    color: rgb(46, 68, 78);

    @media (max-width: 1200px) {
      font-size: 14px;
    }
  }

  .root {
    position: relative;
    overflow: auto;
    min-height: 100vh;
  }
`

export default class MyDocument extends Document {
  static async getInitialProps ({ renderPage }) {
    const page = renderPage()
    const style = styleSheet.getCSS()

    return { ...page, style }
  }

  render () {
    const { style } = this.props;

    return (
      <html>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" type="image/png" href="/static/favicon.png" />

          <title>Styled Components</title>

          <meta charSet="UTF-8" />
          <meta httpEquiv="X-UA-Compatible" content="IE=edge,chrome=1" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes" />

          <meta name="author" content="Styled Components" />
          <meta name="description" content="Visual primitives for the component age. Use the best bits of ES6 and CSS to style your apps without stress 💅" />

          <style dangerouslySetInnerHTML={{ __html: style }} />
       </Head>

       <body>
         <div className="root">
           <Main />
         </div>

         <NextScript />
       </body>
     </html>
    )
  }
}
