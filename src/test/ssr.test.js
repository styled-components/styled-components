import React from 'react'
import { renderToString } from  'react-dom/server'
import ServerStyleSheet from '../models/ServerStyleSheet'
import { resetStyled } from './utils'
import _injectGlobal from '../constructors/injectGlobal'
import stringifyRules from '../utils/stringifyRules'
import css from '../constructors/css'
const injectGlobal = _injectGlobal(stringifyRules, css)

let styled

describe('ssr', () => {
  beforeEach(() => {
    styled = resetStyled(true)
  })

  it('should extract the CSS in a simple case', () => {
    const Heading = styled.h1`
      color: red;
    `

    const sheet = new ServerStyleSheet()
    const html = renderToString(sheet.collectStyles(<Heading>Hello SSR!</Heading>))
    const css = `
${sheet.css.replace(/></g, ">\n<")}
`

    expect({ html, css }).toEqual({
      html: '<h1 class="sc-a b" data-reactroot="" data-reactid="1" data-react-checksum="197727696">Hello SSR!</h1>',
      css: `
<style type="text/css" data-styled-components="b" data-styled-components-is-local="true">
/* sc-component-id: sc-a */
.sc-a {}
.b {color: red;}

</style>
`,
    })
  })

  it('should extract both global and local CSS', () => {
    injectGlobal`
      body { background: papayawhip; }
    `
    const Heading = styled.h1`
      color: red;
    `

    const sheet = new ServerStyleSheet()
    const html = renderToString(sheet.collectStyles(<Heading>Hello SSR!</Heading>))
    const css = `
${sheet.css.replace(/></g, ">\n<")}
`

    expect({ html, css }).toEqual({
      html: '<h1 class="sc-a b" data-reactroot="" data-reactid="1" data-react-checksum="197727696">Hello SSR!</h1>',
      css: `
<style type="text/css" data-styled-components="" data-styled-components-is-local="false">
/* sc-component-id: sc-global-2303210225 */
 body {background: papayawhip;}

</style>
<style type="text/css" data-styled-components="b" data-styled-components-is-local="true">
/* sc-component-id: sc-a */
.sc-a {}
.b {color: red;}

</style>
`,
    })
  })

  it('should render CSS in the order the components were defined, not rendered', () => {
    const ONE = styled.h1.withConfig({ componentId: 'ONE' })`
      color: red;
    `
    const TWO = styled.h2.withConfig({ componentId: 'TWO' })`
      color: blue;
    `

    const sheet = new ServerStyleSheet()
    const html = renderToString(sheet.collectStyles(
      <div>
        <TWO/>
        <ONE/>
      </div>
    ))
    const css = `
${sheet.css.replace(/></g, ">\n<")}
`

    expect({ html, css }).toEqual({
      html: '<div data-reactroot="" data-reactid="1" data-react-checksum="275982144"><h2 class="TWO a" data-reactid="2"></h2><h1 class="ONE b" data-reactid="3"></h1></div>',
      css: `
<style type="text/css" data-styled-components="a b" data-styled-components-is-local="true">
/* sc-component-id: ONE */
.ONE {}
.b {color: red;}
/* sc-component-id: TWO */
.TWO {}
.a {color: blue;}

</style>
`,
    })
  })
})
