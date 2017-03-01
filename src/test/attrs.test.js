// @flow
import React from 'react'
import expect from 'expect'
import { shallow } from 'enzyme'

import { resetStyled, expectCSSMatches } from './utils'

let styled

describe('attrs', () => {
  beforeEach(() => {
    styled = resetStyled()
  })

  it('should work fine with an empty object', () => {
    const Comp = styled.div.attrs({})``
    expect(shallow(<Comp />).html()).toEqual('<div class="sc-a b"></div>')
  })

  it('should pass a simple attr', () => {
    const Comp = styled.button.attrs({
      type: 'button'
    })``
    expect(shallow(<Comp />).html()).toEqual('<button type="button" class="sc-a b"></button>')
  })

  it('should merge attrs objects', () => {
    const Comp = styled.button.attrs({
      type: 'button'
    }).attrs({
      disabled: true
    })``
    expect(shallow(<Comp />).html()).toEqual('<button type="button" disabled class="sc-a b"></button>')
  })

  it('should call an attr function', () => {
    const Comp = styled.button.attrs({
      type: () => 'button'
    })``
    expect(shallow(<Comp />).html()).toEqual('<button type="button" class="sc-a b"></button>')
  })

  it('should pass props to the attr function', () => {
    const Comp = styled.button.attrs({
      type: props => props.submit ? 'submit' : 'button'
    })``
    expect(shallow(<Comp />).html()).toEqual('<button type="button" class="sc-a b"></button>')
    expect(shallow(<Comp submit/>).html()).toEqual('<button type="submit" class="sc-a b"></button>')
  })

  it('should replace attrs with props', () => {
    const Comp = styled.button.attrs({
      type: props => props.submit ? 'submit' : 'button',
      tabIndex: 0
    })``
    expect(shallow(<Comp />).html()).toEqual(
      '<button type="button" tabindex="0" class="sc-a b"></button>'
    )
    expect(shallow(<Comp type="reset"/>).html()).toEqual(
      '<button type="reset" tabindex="0" class="sc-a b"></button>'
    )
    expect(shallow(<Comp type="reset" tabIndex="-1"/>).html()).toEqual(
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
    expect(shallow(<Comp purr/>).html()).toEqual(
      '<div class="sc-a meow purr b"></div>'
    )
  })

  it('should work with data and aria attributes', () => {
    const Comp = styled.div.attrs({
      'data-foo': 'bar',
      'aria-label': 'A simple FooBar'
    })``
    expect(shallow(<Comp />).html()).toEqual('<div data-foo="bar" aria-label="A simple FooBar" class="sc-a b"></div>')
  })

  it('passes attrs to style block', () => {
    /* Would be a React Router Link in IRL */
    const Comp = styled.a.attrs({
      href: '#',
      activeClassName: '--is-active'
    })`
      color: blue;
      &.${props => props.activeClassName} {
        color: red;
      }
    `
    expect(shallow(<Comp />).html()).toEqual('<a href="#" class="sc-a b"></a>')
    expectCSSMatches('.sc-a {} .b { color: blue; } .b.--is-active { color: red; }')
  })

  it('should not pass any attrs by default', () => {
    /* Would be a React Router Link in IRL */
    const Comp = styled('a')`
      color: blue;
    `
    expect(shallow(<Comp href="#" nonsense/>).html()).toEqual('<a class="sc-a b"></a>')
  })

  it('should treat true as passthrough', () => {
    /* Would be a React Router Link in IRL */
    const Comp = styled('a').attrs({
      href: true,
      nonsense: true
    })`
      color: blue;
    `
    expect(shallow(<Comp href="#" nonsense/>).html()).toEqual('<a href="#" nonsense class="sc-a b"></a>')
  })

  it('DOM aliases should have attrs pre-included', () => {
    /* Would be a React Router Link in IRL */
    const Comp = styled.a`
      color: blue;
    `
    expect(shallow(<Comp href="#" nonsense/>).html()).toEqual('<a href="#" class="sc-a b"></a>')
  })

  it('should allow overriding of the pre-attached attrs', () => {
    /* Would be a React Router Link in IRL */
    const Comp = styled.a.attrs({
      href: true,
      nonsense: true
    })`
      color: blue;
    `
    expect(shallow(<Comp href="#" nonsense/>).html()).toEqual('<a href="#" nonsense class="sc-a b"></a>')
  })
})
