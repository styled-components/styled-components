import React from 'react'
import { shallow } from 'enzyme'

import { resetStyled, expectCSSMatches } from './utils'

let styled

describe.only('css features', () => {
  beforeEach(() => {
    styled = resetStyled()
  })

  it('should add vendor prefixes in the right order', () => {
    const Comp = styled.div`
      transition: opacity 0.3s;
    `
    shallow(<Comp />)
    expectCSSMatches('.a { -ms-transition: opacity 0.3s; -moz-transition: opacity 0.3s; -webkit-transition: opacity 0.3s; transition: opacity 0.3s; }')
  })

  it('should handle CSS calc()', () => {
    const Comp = styled.div`
      margin-bottom: calc(15px - 0.5rem) !important;
    `
    shallow(<Comp />)
    expectCSSMatches(`
      .a { 
        margin-bottom: calc(15px - 0.5rem) !important;
        marginBottom:-webkit-calc(15px - 0.5rem) !important;
        marginBottom:-moz-calc(15px - 0.5rem) !important;
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
