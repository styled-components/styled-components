// @flow
import React from 'react'
import { shallow } from 'enzyme'

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
    shallow(<Comp />)
    expectCSSMatches('.sc-a {} .b { color: black; }')
  })
  it('should execute interpolations and inject props', () => {
    const Comp = styled.div`
      color: ${props => props.fg || 'black'};
    `
    shallow(<Comp fg="red"/>)
    expectCSSMatches('.sc-a {} .b { color: red; }')
  })

  it('should execute interpolations and inject props for multiple same components', () => {
    const Comp = styled.div`
      color: ${props => props.fg || 'black'};
    `

    shallow(<Comp fg="red"/>)
    shallow(<Comp fg="green"/>)

    expectCSSMatches('.a { color: red; } .b { color: green; }')
  })
})
