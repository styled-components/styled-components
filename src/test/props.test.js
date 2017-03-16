// @flow
import React from 'react'
import { shallow } from 'enzyme'
import expect from 'expect'

import { resetStyled, expectCSSMatches } from './utils'
import types from '../constructors/types'

let styled

describe.only('props', () => {
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

  it.only('should handle complex non-passed props', () => {
    const Comp = styled.div.props({
      dimensions: types.shape({ width: types.number, height: types.number })
    }).attrs({
      style: props => ({width: `${props.dimensions.width}px`, height: `${props.dimensions.height}px`})
    })``
    console.log(Comp.propTypes)
    expect(shallow(<Comp dimensions={{width: "10", height: 10}}/>).html())
      .toEqual('<div style="width:10px;height:10px;" class="sc-a b"></div>')
  })

  it('should pass through complex props if asked (even if its a really bad idea)', () => {
    const Comp = styled.div.props({
      title: types.shape({ width: types.number.checker, height: types.number.checker }).passed
    }).attrs({
      style: props => ({width: `${props.title.width}px`, height: `${props.title.height}px`})
    })``
    expect(shallow(<Comp title={{width: 10, height: 10}}/>).html())
      .toEqual('<div style="width:10px;height:10px;" title="[object Object]" class="sc-a b"></div>')
  })

  it('should default to any, not passed', () => {
    const Comp = styled.div.props({
      title: types
    })``
    expect(shallow(<Comp title="hihi"/>).html())
      .toEqual('<div class="sc-a b"></div>')
  })

  it('should accept types.passed', () => {
    const Comp = styled.div.props({
      title: types.passed
    })``
    expect(shallow(<Comp title="hihi"/>).html())
      .toEqual('<div title="hihi" class="sc-a b"></div>')
  })
})
