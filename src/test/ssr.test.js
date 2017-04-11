import React from 'react'
import { renderToString } from  'react-dom/server'
import ServerStyleSheet from '../models/ServerStyleSheet'
import { resetStyled } from './utils'

let styled

describe('ssr', () => {
  beforeEach(() => {
    styled = resetStyled()
  })

  it('should extract the CSS in a simple case', () => {
    const Heading = styled.h1`
      color: red;
    `

    const sheet = new ServerStyleSheet()
    const html = renderToString(sheet.collectStyles(<Heading>Hello SSR!</Heading>))
    const css = sheet.css
    expect({html, css}).toEqual({
      html: 'Hello SSR!',
      css: 'color: red;',
    })
  })
})
