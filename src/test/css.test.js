// @flow
import React from 'react'
import { shallow } from 'enzyme'

import { resetStyled, expectCSSMatches } from './utils'

let styled

describe('css features', () => {
  beforeEach(() => {
    styled = resetStyled()
  })

  it('should add vendor prefixes in the right order', () => {
    const Comp = styled.div`
      transition: opacity 0.3s;
    `
    shallow(<Comp />)
    expectCSSMatches('.a { transition: opacity 0.3s; -webkit-transition: opacity 0.3s; }')
  })

  it('should add vendor prefixes for display', () => {
    const Comp = styled.div`
      display: flex;
      flex-direction: column;
      align-items: center;
    `
    shallow(<Comp />)
    expectCSSMatches(`
      .a {
        display: -webkit-box;
        display: -moz-box;
        display: -ms-flexbox;
        display: -webkit-flex;
        display: flex;
        flex-direction: column;
        -webkit-box-direction: normal;
        -webkit-box-orient: vertical;
        -ms-flex-direction: column;
        -webkit-flex-direction: column;
        align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        -webkit-align-items: center;
      }
    `)
  })

  it('should handle CSS calc()', () => {
    const Comp = styled.div`
      margin-bottom: calc(15px - 0.5rem) !important;
    `
    shallow(<Comp />)
    expectCSSMatches(`
      .a {
        margin-bottom: -webkit-calc(15px - 0.5rem) !important;
        margin-bottom: -moz-calc(15px - 0.5rem) !important;
        margin-bottom: calc(15px - 0.5rem) !important;
      }
    `)
  })

  it('should pass through custom properties', () => {
    const Comp = styled.div`
      --custom-prop: some-val;
    `
    shallow(<Comp />)
    expectCSSMatches('.a { --custom-prop: some-val; }')
  })
})
