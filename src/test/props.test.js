// @flow
import React from 'react'
import { shallow } from 'enzyme'
import expect from 'expect'

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
    expect(shallow(<Comp/>).html()).toEqual('<div class="sc-a b"></div>')
    expectCSSMatches('.sc-a {} .b { color: black; }')
  })

  it('should execute interpolations and pass through whitelisted props', () => {
    const Comp = styled.div`
      color: ${props => props.hidden ? 'transparent' : 'black'};
    `
    expect(shallow(<Comp hidden/>).html()).toEqual('<div hidden="" class="sc-a b"></div>')
    expectCSSMatches('.sc-a {} .b { color: transparent; }')
  })

  it('should use interpolations and not pass through non-whitelisted props', () => {
    const Comp = styled.div`
      color: ${props => props.blue ? 'blue' : 'black'};
    `
    expect(shallow(<Comp blue/>).html()).toEqual('<div class="sc-a b"></div>')
    expectCSSMatches('.sc-a {} .b { color: blue; }')
  })
})
