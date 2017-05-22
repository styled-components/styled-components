import Document, { Head, Main, NextScript } from 'next/document'
import { ServerStyleSheet } from 'styled-components'

import { serif } from '../utils/fonts'

const resetStyles = `
  *,::after,::before{background-repeat:no-repeat;box-sizing:inherit}::after,::before{text-decoration:inherit;vertical-align:inherit}html{box-sizing:border-box;cursor:default;-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%}article,aside,footer,header,nav,section{display:block}body{margin:0}h1{font-size:2em;margin:.67em 0}figcaption,figure,main{display:block}figure{margin:1em 40px}hr{box-sizing:content-box;height:0;overflow:visible}nav ol,nav ul{list-style:none}pre{font-family:monospace,monospace;font-size:1em}a{text-decoration:none;color:inherit;background-color:transparent;-webkit-text-decoration-skip:objects}abbr[title]{border-bottom:none;text-decoration:underline;text-decoration:underline dotted}b,strong{font-weight:inherit}b,strong{font-weight:bolder}code,kbd,samp{font-family:monospace,monospace;font-size:1em}dfn{font-style:italic}mark{background-color:#ff0;color:#000}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:baseline}sub{bottom:-.25em}sup{top:-.5em}::-moz-selection{background-color:#b3d4fc;color:#000;text-shadow:none}::selection{background-color:#b3d4fc;color:#000;text-shadow:none}audio,canvas,iframe,img,svg,video{vertical-align:middle}audio,video{display:inline-block}audio:not([controls]){display:none;height:0}img{border-style:none}svg{fill:currentColor}svg:not(:root){overflow:hidden}table{border-collapse:collapse}button,input,optgroup,select,textarea{margin:0}button,input,select,textarea{background-color:transparent;color:inherit;font-size:inherit;line-height:inherit}button,input{overflow:visible}button,select{text-transform:none}[type=reset],[type=submit],button,html [type=button]{-webkit-appearance:button}[type=button]::-moz-focus-inner,[type=reset]::-moz-focus-inner,[type=submit]::-moz-focus-inner,button::-moz-focus-inner{border-style:none;padding:0}[type=button]:-moz-focusring,[type=reset]:-moz-focusring,[type=submit]:-moz-focusring,button:-moz-focusring{outline:1px dotted ButtonText}legend{box-sizing:border-box;color:inherit;display:table;max-width:100%;padding:0;white-space:normal}progress{display:inline-block;vertical-align:baseline}textarea{overflow:auto;resize:vertical}[type=checkbox],[type=radio]{box-sizing:border-box;padding:0}[type=number]::-webkit-inner-spin-button,[type=number]::-webkit-outer-spin-button{height:auto}[type=search]{-webkit-appearance:textfield;outline-offset:-2px}[type=search]::-webkit-search-cancel-button,[type=search]::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}details,menu{display:block}summary{display:list-item}canvas{display:inline-block}template{display:none}[tabindex],a,area,button,input,label,select,summary,textarea{-ms-touch-action:manipulation;touch-action:manipulation}[hidden]{display:none}[aria-busy=true]{cursor:progress}[aria-controls]{cursor:pointer}[aria-hidden=false][hidden]:not(:focus){clip:rect(0,0,0,0);display:inherit;position:absolute}[aria-disabled]{cursor:default}

  .prism-code {
    display: block;
    white-space: pre;
    background-color: #1D1F21;
    color: #C5C8C6;
    padding: 0.5rem;
    margin: 0;
    box-sizing: border-box;
    vertical-align: baseline;
    outline: none;
    text-shadow: none;
    -webkit-hyphens: none;
    -ms-hyphens: none;
    hyphens: none;
    word-wrap: normal;
    word-break: normal;
    text-align: left;
    word-spacing: normal;
    -moz-tab-size: 2;
    -o-tab-size: 2;
    tab-size: 2;
  }
  .token.comment,
  .token.prolog,
  .token.doctype,
  .token.cdata {
    color: hsl(30, 20%, 50%);
  }
  .token.punctuation {
    opacity: .7;
  }
  .namespace {
    opacity: .7;
  }
  .token.property,
  .token.tag,
  .token.boolean,
  .token.number,
  .token.constant,
  .token.symbol {
    color: hsl(350, 40%, 70%);
  }
  .token.selector,
  .token.attr-name,
  .token.string,
  .token.char,
  .token.builtin,
  .token.inserted {
    color: hsl(75, 70%, 60%);
  }
  .token.operator,
  .token.entity,
  .token.url,
  .language-css .token.string,
  .style .token.string,
  .token.variable {
    color: hsl(40, 90%, 60%);
  }
  .token.atrule,
  .token.attr-value,
  .token.keyword {
    color: hsl(350, 40%, 70%);
  }
  .token.regex,
  .token.important {
    color: #e90;
  }
  .token.important,
  .token.bold {
    font-weight: bold;
  }
  .token.italic {
    font-style: italic;
  }
  .token.entity {
    cursor: help;
  }
  .token.deleted {
    color: red;
  }

  @font-face {
    font-family: 'Merriweather';
    font-style: normal;
    font-weight: 400;
    src: local('Merriweather'), local('Merriweather-Regular'), url(https://fonts.gstatic.com/s/merriweather/v15/RFda8w1V0eDZheqfcyQ4EIjoYw3YTyktCCer_ilOlhE.woff2) format('woff2');
    unicode-range: U+0100-024F, U+1E00-1EFF, U+20A0-20AB, U+20AD-20CF, U+2C60-2C7F, U+A720-A7FF;
  }

  @font-face {
    font-family: 'Merriweather';
    font-style: normal;
    font-weight: 400;
    src: local('Merriweather'), local('Merriweather-Regular'), url(https://fonts.gstatic.com/s/merriweather/v15/RFda8w1V0eDZheqfcyQ4EBampu5_7CjHW5spxoeN3Vs.woff2) format('woff2');
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2212, U+2215;
  }

  html, body {
    font-size: 18px;
    line-height: 1.6;
    font-family: ${serif};
    font-style: normal;
    padding: 0;
    margin: 0;
    color: rgb(46, 68, 78);

    -webkit-font-smoothing: subpixel-antialiased;

    @media (max-width: 1000px) {
      font-size: 16px;
    }
  }

  .root {
    position: relative;
    overflow: auto;
  }
`

const description = 'Visual primitives for the component age. Use the best bits of ES6 and CSS to style your apps without stress 💅'

export default class MyDocument extends Document {
  render () {
    const sheet = new ServerStyleSheet()
    const main = sheet.collectStyles(<Main />)
    const styleTags = sheet.getStyleElement()

    return (
      <html>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" type="image/png" href="/static/favicon.png" />
          <link rel="manifest" href="/static/manifest.json" />

          <title>Styled Components</title>

          <meta charSet="UTF-8" />
          <meta httpEquiv="X-UA-Compatible" content="IE=edge,chrome=1" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes" />

          <meta name="theme-color" content="#db7093" />
          <meta name="author" content="Styled Components" />
          <meta name="description" content={description} />

          {/* Open Graph */}
          <link itemprop="url" href="http://styled-components.com/"/>
          <meta itemprop="name" content="Styled Components" />
          <meta itemprop="description" content={description} />
          <meta itemprop="image" content="/static/atom.png" />

          {/* Twitter */}
          <meta name="twitter:card" content="summary" />
          <meta name="twitter:creator" content="@mxstbr" />
          <meta name="twitter:url" content="http://styled-components.com" />
          <meta name="twitter:title" content="Styled Components" />
          <meta name="twitter:description" content={description} />
          <meta name="twitter:image" content="/static/atom.png" />

          {/* Facebook */}
          <meta property="og:url" content="http://styled-components.com" />
          <meta property="og:type" content="website" />
          <meta property="og:title" content="Styled Components" />
          <meta property="og:image" content="/static/atom.png" />
          <meta property="og:image:height" content="652" />
          <meta property="og:image:width" content="652" />
          <meta property="og:description" content={description} />
          <meta property="og:site_name" content="Styled Components" />

          <style dangerouslySetInnerHTML={{ __html: resetStyles }} />
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
