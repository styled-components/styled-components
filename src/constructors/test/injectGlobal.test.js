// @flow
import React, { Component } from 'react'
import expect from 'expect'
import { shallow } from 'enzyme'

import injectGlobal from '../injectGlobal'
import styleSheet from '../../models/AsyncStyleSheet'
import { expectCSSMatches, resetStyled } from '../../test/utils'

let styled = resetStyled()
const rule1 = 'width: 100%;'
const rule2 = 'text-decoration: none;'
const rule3 = 'color: blue;'

describe('injectGlobal', () => {
  beforeEach(() => {
    resetStyled()
  })

  it(`should inject rules into the head`, () => {
    injectGlobal`
      html {
        ${rule1}
      }
    `
    expect(styleSheet.injected).toBe(false);
    styleSheet.forceFlush();
    expect(styleSheet.injected).toBe(true);
  })

  it(`should non-destructively inject styles when called repeatedly`, () => {
    injectGlobal`
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
      html {
        ${rule1}
      }
      a {
        ${rule2}
      }
    `, { styleSheet })
  })
});
