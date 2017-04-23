// @flow
import React from 'react'
import { shallow } from 'enzyme'

import { resetStyled, expectCSSMatches } from './utils'

let styled

describe('withProps', () => {
  beforeEach(() => {
    styled = resetStyled()
  })

  it('work fine with a function returning an empty object', () => {
    const Comp = styled.div.withProps(() => ({}))``
    expect(shallow(<Comp />).html()).toEqual('<div class="sc-a b"></div>')
  })

  it('works with returning an object with a simple prop', () => {
    const Comp = styled.button.withProps(() => ({
      type: 'button'
    }))``

    expect(shallow(<Comp />).html()).toEqual('<button type="button" class="sc-a b"></button>')
  })

  it('receives props in the transformer function', () => {
    const Comp = styled.button.withProps(props => ({
      type: props.submit ? 'submit' : 'button',
      submit: undefined
    }))``

    expect(shallow(<Comp />).html()).toEqual('<button type="button" class="sc-a b"></button>')
    expect(shallow(<Comp submit/>).html()).toEqual('<button type="submit" class="sc-a b"></button>')
  })

  it('merges the result with existing props', () => {
    const Comp = styled.input.withProps(props => ({
      disabled: true
    }))``

    expect(shallow(<Comp type="text"/>).html()).toEqual('<input type="text" disabled="" class="sc-a b"/>')
  })

  it('should merge className', () => {
    const Comp = styled.div.withProps(() => ({
      className: 'meow nya',
    }))``

    expect(shallow(<Comp />).html()).toEqual(
      '<div class="sc-a meow nya b"></div>'
    )
  })

  it('composes chained withProps', () => {
    const Comp = styled.button.withProps(() => ({
      type: 'button',
    })).withProps(() => ({
      tabIndex: 0
    }))``
    expect(shallow(<Comp />).html()).toEqual('<button type="button" tabindex="0" class="sc-a b"></button>')
  })
})
