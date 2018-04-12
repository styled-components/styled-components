// @flow
import React from 'react'
import { mount, shallow } from 'enzyme'

import { resetStyled, expectCSSMatches } from './utils'

let styled

describe('props', () => {
  beforeEach(() => {
    styled = resetStyled()

    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should execute interpolations and fall back', () => {
    const Comp = styled.div`
      color: ${props => props.fg || 'black'};
    `
    shallow(<Comp />)
    expectCSSMatches('.sc-a {} .b { color:black; }')
  })

  it('should execute interpolations and inject props', () => {
    const Comp = styled.div`
      color: ${props => props.fg || 'black'};
    `
    shallow(<Comp fg="red" />)
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
    shallow(<Comp fg="red" />)
    expectCSSMatches('.sc-a {} .b { border-width:0; }')
  })

  it('should not pass through the reserved "sc" attribute', () => {
    const Comp = styled.div`
      color: ${p => p.sc.color || 'black'};
    `

    expect(
      mount(<Comp sc={{ color: 'red' }} />)
        .childAt(0)
        .props()
    ).not.toContain('sc')
  })
})
