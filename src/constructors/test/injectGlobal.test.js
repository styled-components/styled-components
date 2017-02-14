// @flow
import React, { Component } from 'react'
import expect from 'expect'
import { shallow } from 'enzyme'

import injectGlobal from '../injectGlobal'
import styleSheet from '../../models/StyleSheet'
import { expectCSSMatches, resetStyled } from '../../test/utils'

let styled = resetStyled()
const rule1 = 'width: 100%;'
const rule2 = 'text-decoration: none;'
const rule3 = 'color: blue;'
const rule4 = `@font-face {
  font-family: 'some font';
  src: url('fontFile.ttf') format('truetype');
}`

describe('injectGlobal', () => {
  beforeEach(() => {
    resetStyled()
  })

  it(`should inject rules into the head`, () => {
    injectGlobal`
      ${rule4}
      html {
        ${rule1}
      }
    `
    expect(styleSheet.injected).toBe(true)
  })

  it(`should non-destructively inject styles when called repeatedly`, () => {
    injectGlobal`
      ${rule4}
      html {
        ${rule1}
      }
    `

    injectGlobal`
      a {
        ${rule2}
      }
    `
    expectCSSMatches(`
      ${rule4}
      html {
        ${rule1}
      }
      a {
        ${rule2}
      }
    `)
  })

  it(`should non-destructively inject styles when called after a component`, () => {
    const Comp = styled.div`
      ${rule3}
    `
    shallow(<Comp />)

    injectGlobal`
      ${rule4}
      html {
        ${rule1}
      }
    `

    expectCSSMatches(`
      .sc-a {}
      .b {
        ${rule3}
      }
      ${rule4}
      html {
        ${rule1}
      }
    `)
  })
});
