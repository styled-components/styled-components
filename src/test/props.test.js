// @flow
import React from 'react'
import { mount } from 'enzyme'

import { resetStyled, expectCSSMatches } from './utils'

let styled

describe('props', () => {
  beforeEach(() => {
    styled = resetStyled()
  })

  it('should execute interpolations and fall back', () => {
    const Comp = styled.div`
      color: ${props => props.fg || 'black'};
    `
    mount(<Comp />)
    expectCSSMatches('.sc-a {} .b { color:black; }')
  })
  it('should execute interpolations and inject props', () => {
    const Comp = styled.div`
      color: ${props => props.fg || 'black'};
    `
    mount(<Comp fg="red" />)
    expectCSSMatches('.sc-a {} .b { color:red; }')
  })
  it('should ignore non-0 falsy object interpolations', () => {
    const Comp = styled.div`
      ${() => ({
        borderWidth: 0,
        colorA: null,
        colorB: false,
        colorC: undefined,
        colorD: '',
      })};
    `
    mount(<Comp fg="red" />)
    expectCSSMatches('.sc-a {} .b { border-width:0; }')
  })
})
