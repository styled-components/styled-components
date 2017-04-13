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
    injectGlobal`
      body { background: papayawhip; }
    `
    const Heading = styled.h1`
      color: red;
    `

    const sheet = new ServerStyleSheet()
    const html = renderToString(sheet.collectStyles(<Heading>Hello SSR!</Heading>))
    const css = sheet.css

    expect({ html, css }).toEqual({
      html: '<h1 class="sc-a b" data-reactroot="" data-reactid="1" data-react-checksum="197727696">Hello SSR!</h1>',
      css: `<style type="text/css" data-styled-components="b" data-styled-components-is-local="true">
/* sc-component-id: sc-a */
.sc-a {}
.b {color: red;}

</style>`,
    })
  })
})
