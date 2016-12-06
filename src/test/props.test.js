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
    expectCSSMatches('.b { color: black; }')
  })
  it('should execute interpolations and inject props', () => {
    const Comp = styled.div`
      color: ${props => props.fg || 'black'};
    `
    shallow(<Comp fg="red"/>)
    expectCSSMatches('.b { color: red; }')
  })
})
