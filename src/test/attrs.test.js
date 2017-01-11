// @flow
import React from 'react'
import expect from 'expect'
import { shallow } from 'enzyme'

import { resetStyled, expectCSSMatches } from './utils'

let styled

describe.only('attrs', () => {
  beforeEach(() => {
    styled = resetStyled()
  })

  it('work fine with an empty object', () => {
    const Comp = styled.div.attrs({})``
    expect(shallow(<Comp />).html()).toEqual('<div class="sc-a b"></div>')
  })

  it('pass a simple attr', () => {
    const Comp = styled.button.attrs({
      type: 'button'
    })``
    expect(shallow(<Comp />).html()).toEqual('<button type="button" class="sc-a b"></button>')
  })

  it('call an attr function', () => {
    const Comp = styled.button.attrs({
      type: () => 'button'
    })``
    expect(shallow(<Comp />).html()).toEqual('<button type="button" class="sc-a b"></button>')
  })

  it('pass an attr function the props', () => {
    const Comp = styled.button.attrs({
      type: props => props.submit ? 'submit' : 'button'
    })``
    expect(shallow(<Comp />).html()).toEqual('<button type="button" class="sc-a b"></button>')
    expect(shallow(<Comp submit />).html()).toEqual('<button type="submit" class="sc-a b"></button>')
  })

  it('should replace attrs with props', () => {
    const Comp = styled.button.attrs({
      type: props => props.submit ? 'submit' : 'button',
      tabIndex: 0
    })``
    expect(shallow(<Comp />).html()).toEqual(
      '<button type="button" tabindex="0" class="sc-a b"></button>'
    )
    expect(shallow(<Comp type="reset" />).html()).toEqual(
      '<button type="reset" tabindex="0" class="sc-a b"></button>'
    )
    expect(shallow(<Comp type="reset" tabIndex="-1" />).html()).toEqual(
      '<button type="reset" tabindex="-1" class="sc-a b"></button>'
    )
  })

  it('should merge className', () => {
    const Comp = styled.div.attrs({
      className: 'meow nya',
    })``
    expect(shallow(<Comp />).html()).toEqual(
      '<div class="sc-a meow nya b"></div>'
    )
  })

  it('should merge className even if its a function', () => {
    const Comp = styled.div.attrs({
      className: props => `meow ${ props.purr ? 'purr' : 'nya' }`,
    })``
    expect(shallow(<Comp />).html()).toEqual(
      '<div class="sc-a meow nya b"></div>'
    )
    expect(shallow(<Comp purr />).html()).toEqual(
      '<div class="sc-a meow purr b"></div>'
    )
  })

})
