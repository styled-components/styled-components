// @flow
import React from 'react'
import { shallow } from 'enzyme'
import expect from 'expect'

import { resetStyled, expectCSSMatches } from './utils'
import types from '../constructors/types'

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

  it('should execute interpolations and inject props', () => {
    const Comp = styled.div`
      color: ${props => props.hidden ? 'transparent' : 'black'};
    `
    expect(shallow(<Comp hidden/>).html()).toEqual('<div hidden="" class="sc-a b"></div>')
    expectCSSMatches('.sc-a {} .b { color: transparent; }')
  })

  it('should not pass any props that are defined', () => {
    const Comp = styled.div.props({
      hidden: types.any,
    })``
    expect(shallow(<Comp hidden/>).html()).toEqual('<div class="sc-a b"></div>')
  })

  it('should still make props available in style blocks', () => {
    const Comp = styled.div.props({
      hidden: types.any,
    })`
      color: ${props => props.hidden ? 'transparent' : 'black'};
    `
    expect(shallow(<Comp hidden/>).html()).toEqual('<div class="sc-a b"></div>')
    expectCSSMatches('.sc-a {} .b { color: transparent; }')
  })

  it('should convert props to proptypes', () => {
    const Comp = styled.div.props({
      hidden: types.bool,
    })``
    expect(Comp.propTypes).toEqual({
      hidden: React.PropTypes.bool
    })
  })

  it('should pass through props using passed', () => {
    const Comp = styled.div.props({
      hidden: types.bool.passed,
    })``
    expect(shallow(<Comp hidden/>).html()).toEqual('<div hidden="" class="sc-a b"></div>')
  })
})
